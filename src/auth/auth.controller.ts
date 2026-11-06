import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import type { AuthenticatedUser } from './types/authenticated-user';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('request-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Telefon raqamga OTP kod yuborish (Telegram bot / SMS)' })
  requestOtp(@Body() dto: RequestOtpDto, @Ip() ip: string, @Headers('user-agent') userAgent?: string) {
    return this.auth.requestOtp(dto, { ip, userAgent });
  }

  @Post('verify-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'OTP kodni tekshirish va tokenlar olish' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Ip() ip: string, @Headers('user-agent') userAgent?: string) {
    return this.auth.verifyOtp(dto, { ip, userAgent });
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Access tokenni refresh token bilan yangilash (rotatsiya)' })
  refresh(@Body() dto: RefreshTokenDto, @Ip() ip: string, @Headers('user-agent') userAgent?: string) {
    return this.auth.refresh(dto, { ip, userAgent });
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh tokenni bekor qilish' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Joriy foydalanuvchi profili' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user.id);
  }
}
