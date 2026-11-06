import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CargoStatus,
  NotificationType,
  OfferStatus,
  Prisma,
  UserRole,
  VehicleStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { VEHICLE_LABELS } from '../common/constants';
import { isUuid } from '../common/utils/uuid';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOfferDto } from './dto/create-offer.dto';

const OFFER_INCLUDE = {
  driver: {
    select: { id: true, fullName: true, phone: true, rating: true, ratingCount: true },
  },
  vehicle: { select: { id: true, plateNumber: true, vehicleType: true } },
  cargo: {
    select: {
      id: true,
      code: true,
      title: true,
      pickupCity: true,
      dropoffCity: true,
      pickupDate: true,
      price: true,
      status: true,
      ownerId: true,
    },
  },
} as const;

type OfferWithRelations = Prisma.OfferGetPayload<{ include: typeof OFFER_INCLUDE }>;

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(cargoId: string, user: AuthenticatedUser, dto: CreateOfferDto) {
    const cargo = await this.requireOpenCargo(cargoId);

    if (cargo.ownerId === user.id) {
      throw new ForbiddenException('O‘z e’loningizga taklif bera olmaysiz');
    }

    const vehicle = await this.resolveVehicle(user, dto.vehicleId);

    const existing = await this.prisma.offer.findUnique({
      where: { cargoId_driverId: { cargoId, driverId: user.id } },
    });

    if (existing && existing.status !== OfferStatus.REJECTED && existing.status !== OfferStatus.WITHDRAWN) {
      throw new ConflictException('Siz bu yukka allaqachon taklif bergansiz');
    }

    const message = dto.message?.trim() || null;
    const driverName = user.fullName || user.phone;

    const offer = await this.prisma.$transaction(async (tx) => {
      const row = existing
        ? await tx.offer.update({
            where: { id: existing.id },
            data: {
              price: dto.price,
              message,
              vehicleId: vehicle.id,
              status: OfferStatus.PENDING,
              respondedAt: null,
            },
            include: OFFER_INCLUDE,
          })
        : await tx.offer.create({
            data: {
              cargoId,
              driverId: user.id,
              vehicleId: vehicle.id,
              price: dto.price,
              message,
            },
            include: OFFER_INCLUDE,
          });

      await tx.cargo.update({
        where: { id: cargoId },
        data: { offerCount: { increment: 1 } },
      });

      await tx.notification.create({
        data: {
          userId: cargo.ownerId,
          type: NotificationType.OFFER_NEW,
          title: 'Yangi taklif',
          body: `${driverName} · ${formatSom(dto.price)} so‘m · ${cargo.code}`,
          payload: { cargoId, offerId: row.id, driverId: user.id },
        },
      });

      return row;
    });

    return this.toView(offer, false);
  }

  async listForCargo(cargoId: string, user: AuthenticatedUser) {
    if (!isUuid(cargoId)) {
      throw new NotFoundException('E’lon topilmadi');
    }

    const cargo = await this.prisma.cargo.findFirst({
      where: { id: cargoId, deletedAt: null },
      select: { id: true, ownerId: true },
    });

    if (!cargo) {
      throw new NotFoundException('E’lon topilmadi');
    }

    if (cargo.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu e’lon takliflarini ko‘rish huquqi yo‘q');
    }

    const rows = await this.prisma.offer.findMany({
      where: { cargoId },
      include: OFFER_INCLUDE,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });

    return { items: rows.map((row) => this.toView(row, true)), total: rows.length };
  }

  async mine(user: AuthenticatedUser, cargoId?: string) {
    const where: Prisma.OfferWhereInput = {
      driverId: user.id,
      ...(cargoId ? { cargoId } : {}),
    };

    const rows = await this.prisma.offer.findMany({
      where,
      include: OFFER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return { items: rows.map((row) => this.toView(row, false)), total: rows.length };
  }

  async accept(offerId: string, user: AuthenticatedUser) {
    const offer = await this.requireOffer(offerId);
    this.ensureOwner(offer, user);

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan taklifni qabul qilish mumkin');
    }

    await this.requireOpenCargo(offer.cargoId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.ACCEPTED, respondedAt: new Date() },
        include: OFFER_INCLUDE,
      });

      const rejected = await tx.offer.findMany({
        where: { cargoId: offer.cargoId, status: OfferStatus.PENDING, NOT: { id: offerId } },
        select: { id: true, driverId: true },
      });

      if (rejected.length) {
        await tx.offer.updateMany({
          where: { id: { in: rejected.map((item) => item.id) } },
          data: { status: OfferStatus.REJECTED, respondedAt: new Date() },
        });
      }

      await tx.cargo.update({
        where: { id: offer.cargoId },
        data: { status: CargoStatus.IN_PROGRESS, offerCount: 0 },
      });

      const conversation = await tx.conversation.upsert({
        where: { cargoId_driverId: { cargoId: offer.cargoId, driverId: row.driverId } },
        create: {
          cargoId: offer.cargoId,
          ownerId: row.cargo.ownerId,
          driverId: row.driverId,
        },
        update: {},
        select: { id: true },
      });

      await tx.notification.create({
        data: {
          userId: row.driverId,
          type: NotificationType.OFFER_ACCEPTED,
          title: 'Taklifingiz qabul qilindi',
          body: `${row.cargo.code} · ${formatSom(row.price)} so‘m`,
          payload: { cargoId: offer.cargoId, offerId, conversationId: conversation.id },
        },
      });

      for (const item of rejected) {
        await tx.notification.create({
          data: {
            userId: item.driverId,
            type: NotificationType.OFFER_REJECTED,
            title: 'Taklif rad etildi',
            body: `${row.cargo.code} · boshqa haydovchi tanlandi`,
            payload: { cargoId: offer.cargoId, offerId: item.id },
          },
        });
      }

      return row;
    });

    return this.toView(updated, true);
  }

  async reject(offerId: string, user: AuthenticatedUser) {
    const offer = await this.requireOffer(offerId);
    this.ensureOwner(offer, user);

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan taklifni rad etish mumkin');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.REJECTED, respondedAt: new Date() },
        include: OFFER_INCLUDE,
      });

      await this.recountOffers(tx, offer.cargoId);

      await tx.notification.create({
        data: {
          userId: row.driverId,
          type: NotificationType.OFFER_REJECTED,
          title: 'Taklif rad etildi',
          body: row.cargo.code,
          payload: { cargoId: offer.cargoId, offerId },
        },
      });

      return row;
    });

    return this.toView(updated, false);
  }

  async withdraw(offerId: string, user: AuthenticatedUser) {
    const offer = await this.requireOffer(offerId);

    if (offer.driverId !== user.id) {
      throw new ForbiddenException('Bu taklifni qaytarib olish huquqi yo‘q');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Faqat kutilayotgan taklifni qaytarib olish mumkin');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.WITHDRAWN, respondedAt: new Date() },
        include: OFFER_INCLUDE,
      });

      await this.recountOffers(tx, offer.cargoId);
      return row;
    });

    return this.toView(updated, false);
  }

  private async requireOffer(offerId: string) {
    if (!isUuid(offerId)) {
      throw new NotFoundException('Taklif topilmadi');
    }

    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: OFFER_INCLUDE,
    });

    if (!offer) {
      throw new NotFoundException('Taklif topilmadi');
    }

    return offer;
  }

  private ensureOwner(offer: OfferWithRelations, user: AuthenticatedUser) {
    if (offer.cargo.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu taklifni boshqarish huquqi yo‘q');
    }
  }

  private async requireOpenCargo(cargoId: string) {
    if (!isUuid(cargoId)) {
      throw new NotFoundException('E’lon topilmadi');
    }

    const cargo = await this.prisma.cargo.findFirst({
      where: { id: cargoId, deletedAt: null },
      select: { id: true, code: true, ownerId: true, status: true, expiresAt: true },
    });

    if (!cargo) {
      throw new NotFoundException('E’lon topilmadi');
    }

    if (cargo.status !== CargoStatus.PUBLISHED) {
      throw new BadRequestException('Bu e’lon taklif qabul qilmayapti');
    }

    if (cargo.expiresAt && cargo.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('E’lon muddati tugagan');
    }

    return cargo;
  }

  private async resolveVehicle(user: AuthenticatedUser, vehicleId?: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (!vehicles.length) {
      throw new BadRequestException('Avval mashina qo‘shing');
    }

    if (vehicleId) {
      const chosen = vehicles.find((item) => item.id === vehicleId);
      if (!chosen) {
        throw new NotFoundException('Mashina topilmadi');
      }
      if (chosen.status === VehicleStatus.BLOCKED) {
        throw new ForbiddenException('Bloklangan mashina bilan taklif bera olmaysiz');
      }
      return chosen;
    }

    return (
      vehicles.find((item) => item.status === VehicleStatus.ACTIVE) ??
      vehicles.find((item) => item.status !== VehicleStatus.BLOCKED) ??
      vehicles[0]
    );
  }

  private async recountOffers(tx: Prisma.TransactionClient, cargoId: string) {
    const pending = await tx.offer.count({
      where: { cargoId, status: OfferStatus.PENDING },
    });

    await tx.cargo.update({ where: { id: cargoId }, data: { offerCount: pending } });
  }

  private toView(offer: OfferWithRelations, includePhone: boolean) {
    return {
      id: offer.id,
      cargoId: offer.cargoId,
      cargo: {
        id: offer.cargo.id,
        code: offer.cargo.code,
        title: offer.cargo.title,
        pickupCity: offer.cargo.pickupCity,
        dropoffCity: offer.cargo.dropoffCity,
        pickupDate: offer.cargo.pickupDate,
        price: offer.cargo.price,
        status: offer.cargo.status,
      },
      driver: {
        id: offer.driver.id,
        name: offer.driver.fullName ?? 'Yukchi haydovchisi',
        rating: Number(offer.driver.rating),
        ratingCount: offer.driver.ratingCount,
        ...(includePhone ? { phone: offer.driver.phone } : {}),
      },
      vehicle: offer.vehicle
        ? {
            id: offer.vehicle.id,
            plateNumber: offer.vehicle.plateNumber,
            vehicleType: offer.vehicle.vehicleType,
            vehicleLabel: VEHICLE_LABELS[offer.vehicle.vehicleType],
          }
        : null,
      price: offer.price,
      message: offer.message,
      status: offer.status,
      createdAt: offer.createdAt,
      respondedAt: offer.respondedAt,
    };
  }
}

function formatSom(amount: number) {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
