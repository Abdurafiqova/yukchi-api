import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole, UserStatus } from '@prisma/client';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { normalizePhone } from '../common/utils/phone';
import { PrismaService } from '../prisma/prisma.service';
import type { RefreshTokenDto } from './dto/refresh-token.dto';
import type { RequestOtpDto } from './dto/request-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';
import type { JwtPayload } from './types/authenticated-user';
import type { RequestMeta } from './types/request-meta';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async requestOtp(dto: RequestOtpDto, meta: RequestMeta) {
    const phone = normalizePhone(dto.phone);
    if (!phone) {
      throw new BadRequestException('Telefon raqami noto‘g‘ri. Masalan: +998901234567');
    }

    const now = new Date();
    const { ttlSeconds, cooldownSeconds, maxPerHour, exposeDevCode } = this.otpConfig();

    const lastCode = await this.prisma.otpCode.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (lastCode) {
      const elapsedMs = now.getTime() - lastCode.createdAt.getTime();
      if (elapsedMs < cooldownSeconds * 1000) {
        const retryAfter = Math.ceil((cooldownSeconds * 1000 - elapsedMs) / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Iltimos, ${retryAfter} soniyadan so‘ng qayta so‘rang`,
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const sentThisHour = await this.prisma.otpCode.count({
      where: { phone, createdAt: { gte: new Date(now.getTime() - HOUR_MS) } },
    });

    if (sentThisHour >= maxPerHour) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Bir soat ichida juda ko‘p kod so‘raldi. Keyinroq urinib ko‘ring',
          retryAfter: 3600,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash: this.hashOtp(phone, code),
        attempts: 0,
        maxAttempts: this.otpConfig().maxAttempts,
        expiresAt,
        ip: meta.ip,
      },
    });

    if (this.config.get<string>('nodeEnv') !== 'production') {
      this.logger.warn(`[DEV] OTP for ${phone}: ${code}`);
    }

    return {
      ok: true,
      phone,
      expiresIn: ttlSeconds,
      ...(exposeDevCode ? { devCode: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto, meta: RequestMeta) {
    const phone = normalizePhone(dto.phone);
    if (!phone) {
      throw new BadRequestException('Telefon raqami noto‘g‘ri');
    }

    const now = new Date();
    const record = await this.prisma.otpCode.findFirst({
      where: { phone, purpose: 'LOGIN', consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Kod topilmadi yoki muddati tugagan. Yangi kod so‘rang');
    }

    if (record.attempts >= record.maxAttempts) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Urinishlar soni tugadi. Yangi kod so‘rang',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.matches(this.hashOtp(phone, dto.code), record.codeHash)) {
      const updated = await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true, maxAttempts: true },
      });

      throw new BadRequestException({
        message: 'Kod noto‘g‘ri',
        attemptsLeft: Math.max(updated.maxAttempts - updated.attempts, 0),
      });
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: now },
    });

    const user = await this.prisma.user.upsert({
      where: { phone },
      create: {
        phone,
        fullName: dto.fullName?.trim() || null,
        role: dto.role ?? UserRole.CARGO_OWNER,
        lastLoginAt: now,
      },
      update: {
        lastLoginAt: now,
        ...(dto.fullName?.trim() ? { fullName: dto.fullName.trim() } : {}),
      },
    });

    if (user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new ForbiddenException('Hisob bloklangan. Qo‘llab-quvvatlash bilan bog‘laning');
    }

    const tokens = await this.issueTokens(user, meta);

    return {
      ...tokens,
      user: await this.buildProfile(user),
    };
  }

  async refresh(dto: RefreshTokenDto, meta: RequestMeta) {
    const now = new Date();
    const tokenHash = this.hashToken(dto.refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token topilmadi');
    }

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException('Refresh token qayta ishlatildi. Qaytadan kiring');
    }

    if (stored.expiresAt <= now) {
      throw new UnauthorizedException('Refresh token muddati tugagan. Qaytadan kiring');
    }

    if (stored.user.status !== UserStatus.ACTIVE || stored.user.deletedAt) {
      throw new ForbiddenException('Hisob faol emas');
    }

    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresAt = new Date(
      now.getTime() + this.jwtConfig().refreshTtlDays * 24 * HOUR_MS,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const revoked = await tx.refreshToken.updateMany({
        where: { id: stored.id, revokedAt: null },
        data: { revokedAt: now },
      });

      if (revoked.count === 0) {
        throw new UnauthorizedException('Refresh token qayta ishlatildi');
      }

      const next = await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: this.hashToken(refreshToken),
          expiresAt: refreshExpiresAt,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      });

      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { replacedBy: next.id },
      });

      return next;
    });

    const accessToken = await this.signAccessToken(stored.user);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.jwtConfig().accessTtlSeconds,
      refreshTokenExpiresAt: created.expiresAt.toISOString(),
      user: await this.buildProfile(stored.user),
    };
  }

  async logout(dto: RefreshTokenDto) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(dto.refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { ok: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return this.buildProfile(user);
  }

  private async issueTokens(user: User, meta: RequestMeta) {
    const { accessTtlSeconds, refreshTtlDays } = this.jwtConfig();
    const accessToken = await this.signAccessToken(user);
    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * HOUR_MS);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: refreshExpiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessTtlSeconds,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    };
  }

  private signAccessToken(user: Pick<User, 'id' | 'phone' | 'role'>) {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    return this.jwt.signAsync(payload, {
      secret: this.jwtConfig().accessSecret,
      expiresIn: this.jwtConfig().accessTtlSeconds,
    });
  }

  private async buildProfile(user: User) {
    const [cargoCount, offersCount] = await Promise.all([
      this.prisma.cargo.count({ where: { ownerId: user.id, deletedAt: null } }),
      this.prisma.offer.count({ where: { driverId: user.id } }),
    ]);

    return {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      companyName: user.companyName,
      language: user.language,
      rating: Number(user.rating),
      ratingCount: user.ratingCount,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      stats: { cargoCount, offersCount },
    };
  }

  private hashOtp(phone: string, code: string) {
    return createHmac('sha256', this.otpConfig().hashSecret)
      .update(`${phone}:${code}`)
      .digest('hex');
  }

  private hashToken(token: string) {
    return createHmac('sha256', this.jwtConfig().accessSecret).update(token).digest('hex');
  }

  private matches(a: string, b: string) {
    const left = Buffer.from(a, 'utf8');
    const right = Buffer.from(b, 'utf8');
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private otpConfig() {
    return {
      hashSecret: this.config.get<string>('otp.hashSecret', ''),
      ttlSeconds: this.config.get<number>('otp.ttlSeconds', 120),
      maxAttempts: this.config.get<number>('otp.maxAttempts', 5),
      cooldownSeconds: this.config.get<number>('otp.resendCooldownSeconds', 60),
      maxPerHour: this.config.get<number>('otp.maxPerHour', 5),
      exposeDevCode: this.config.get<boolean>('otp.exposeDevCode', false),
    };
  }

  private jwtConfig() {
    return {
      accessSecret: this.config.get<string>('jwt.accessSecret', ''),
      accessTtlSeconds: this.config.get<number>('jwt.accessTtlSeconds', 900),
      refreshTtlDays: this.config.get<number>('jwt.refreshTtlDays', 30),
    };
  }
}
