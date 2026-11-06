import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CargoStatus,
  ModerationAction,
  NotificationType,
  Prisma,
  UserRole,
  UserStatus,
  VehicleStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CargosService } from '../cargos/cargos.service';
import { VEHICLE_LABELS } from '../common/constants';
import { DocumentsService } from '../documents/documents.service';
import type { ListDocumentsDto } from '../documents/dto/list-documents.dto';
import type { ReviewDocumentDto } from '../documents/dto/review-document.dto';
import { isUuid } from '../common/utils/uuid';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ListModerationDto,
  ListUsersDto,
  ListVehiclesDto,
  UpdateUserStatusDto,
} from './dto/admin.dto';

const VEHICLE_ADMIN_INCLUDE = {
  driver: {
    select: { id: true, phone: true, fullName: true, rating: true, ratingCount: true },
  },
} as const;

type VehicleWithDriver = Prisma.VehicleGetPayload<{ include: typeof VEHICLE_ADMIN_INCLUDE }>;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cargos: CargosService,
    private readonly documents: DocumentsService,
  ) {}

  async stats() {
    const [totalUsers, owners, drivers, totalCargos, totalOffers, byStatus, pendingReview] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { deletedAt: null, role: UserRole.CARGO_OWNER } }),
        this.prisma.user.count({ where: { deletedAt: null, role: UserRole.DRIVER } }),
        this.prisma.cargo.count({ where: { deletedAt: null } }),
        this.prisma.offer.count(),
        this.prisma.cargo.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.cargo.count({
          where: { deletedAt: null, status: CargoStatus.PENDING_REVIEW },
        }),
      ]);

    const cargosByStatus = Object.values(CargoStatus).reduce<Record<string, number>>(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {},
    );

    for (const row of byStatus) {
      cargosByStatus[row.status] = row._count._all;
    }

    return {
      users: { total: totalUsers, owners, drivers },
      cargos: { total: totalCargos, byStatus: cargosByStatus },
      offers: { total: totalOffers },
      moderation: { pendingReview },
      generatedAt: new Date().toISOString(),
    };
  }

  listCargos(query: ListModerationDto) {
    return this.cargos.listForModeration(query.status, query.page, query.limit);
  }

  approveCargo(id: string, moderator: AuthenticatedUser, note?: string) {
    return this.cargos.approve(id, moderator, note);
  }

  rejectCargo(id: string, moderator: AuthenticatedUser, note: string) {
    return this.cargos.reject(id, moderator, note);
  }

  async listUsers(query: ListUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const and: Prisma.UserWhereInput[] = [];
    if (query.q) {
      const q = query.q.trim();
      and.push({
        OR: [
          { phone: { contains: q } },
          { fullName: { contains: q, mode: 'insensitive' } },
          { companyName: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(and.length ? { AND: and } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          phone: true,
          fullName: true,
          companyName: true,
          role: true,
          status: true,
          rating: true,
          ratingCount: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { cargos: true, offers: true } },
        },
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        phone: row.phone,
        fullName: row.fullName,
        companyName: row.companyName,
        role: row.role,
        status: row.status,
        rating: Number(row.rating),
        ratingCount: row.ratingCount,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        cargoCount: row._count.cargos,
        offerCount: row._count.offers,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNext: page * limit < total,
    };
  }

  async listVehicles(query: ListVehiclesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.VehicleWhereInput = query.status ? { status: query.status } : {};

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        include: VEHICLE_ADMIN_INCLUDE,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((row) => this.toVehicleView(row)),
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNext: page * limit < total,
    };
  }

  listDocuments(query: ListDocumentsDto) {
    return this.documents.listForAdmin(query);
  }

  reviewDocument(id: string, moderator: AuthenticatedUser, dto: ReviewDocumentDto) {
    return this.documents.review(id, moderator, dto);
  }

  approveVehicle(id: string) {
    return this.setVehicleStatus(id, VehicleStatus.ACTIVE);
  }

  blockVehicle(id: string) {
    return this.setVehicleStatus(id, VehicleStatus.BLOCKED);
  }

  private async setVehicleStatus(id: string, status: VehicleStatus) {
    if (!isUuid(id)) {
      throw new NotFoundException('Mashina topilmadi');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Mashina topilmadi');
    }

    const label = `${VEHICLE_LABELS[vehicle.vehicleType]} · ${vehicle.plateNumber}`;
    const approved = status === VehicleStatus.ACTIVE;

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.vehicle.update({
        where: { id },
        data: { status },
        include: VEHICLE_ADMIN_INCLUDE,
      });

      await tx.notification.create({
        data: {
          userId: vehicle.userId,
          type: NotificationType.MODERATION,
          title: approved ? 'Mashinangiz tasdiqlandi' : 'Mashinangiz bloklandi',
          body: label,
          payload: { vehicleId: id, status },
        },
      });

      return this.toVehicleView(row);
    });
  }

  private toVehicleView(vehicle: VehicleWithDriver) {
    return {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      vehicleType: vehicle.vehicleType,
      vehicleLabel: VEHICLE_LABELS[vehicle.vehicleType],
      capacityKg: vehicle.capacityKg,
      bodyVolumeM3: vehicle.bodyVolumeM3 ? Number(vehicle.bodyVolumeM3) : null,
      status: vehicle.status,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
      driver: {
        id: vehicle.driver.id,
        phone: vehicle.driver.phone,
        fullName: vehicle.driver.fullName,
        rating: Number(vehicle.driver.rating),
        ratingCount: vehicle.driver.ratingCount,
      },
    };
  }

  async setUserStatus(
    id: string,
    moderator: AuthenticatedUser,
    dto: UpdateUserStatusDto,
  ) {
    if (!isUuid(id)) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const now = new Date();
    const blocked = dto.status === UserStatus.BLOCKED;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: dto.status } });

      if (blocked) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      await tx.moderationLog.create({
        data: {
          moderatorId: moderator.id,
          action: blocked ? ModerationAction.BLOCK_USER : ModerationAction.UNBLOCK_USER,
          note: dto.note?.trim() || null,
        },
      });
    });

    return { id, status: dto.status };
  }
}
