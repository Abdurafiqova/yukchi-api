import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Vehicle, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { VEHICLE_LABELS } from '../common/constants';
import { isUuid } from '../common/utils/uuid';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateVehicleDto } from './dto/create-vehicle.dto';
import type { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const rows = await this.prisma.vehicle.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return { items: rows.map((row) => this.toView(row)), total: rows.length };
  }

  async create(user: AuthenticatedUser, dto: CreateVehicleDto) {
    const plateNumber = this.normalizePlate(dto.plateNumber);
    await this.ensurePlateFree(user.id, plateNumber);

    const row = await this.prisma.vehicle.create({
      data: {
        userId: user.id,
        plateNumber,
        vehicleType: dto.vehicleType,
        capacityKg: dto.capacityKg,
        bodyVolumeM3: dto.bodyVolumeM3 ?? null,
      },
    });

    return this.toView(row);
  }

  async update(id: string, user: AuthenticatedUser, dto: UpdateVehicleDto) {
    const vehicle = await this.requireVehicle(id, user);

    const plateNumber =
      dto.plateNumber !== undefined ? this.normalizePlate(dto.plateNumber) : vehicle.plateNumber;

    if (plateNumber !== vehicle.plateNumber) {
      await this.ensurePlateFree(user.id, plateNumber, id);
    }

    const row = await this.prisma.vehicle.update({
      where: { id },
      data: {
        plateNumber,
        ...(dto.vehicleType !== undefined ? { vehicleType: dto.vehicleType } : {}),
        ...(dto.capacityKg !== undefined ? { capacityKg: dto.capacityKg } : {}),
        ...(dto.bodyVolumeM3 !== undefined ? { bodyVolumeM3: dto.bodyVolumeM3 } : {}),
      },
    });

    return this.toView(row);
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.requireVehicle(id, user);
    await this.prisma.vehicle.delete({ where: { id } });
    return { ok: true, id };
  }

  private async requireVehicle(id: string, user: AuthenticatedUser) {
    if (!isUuid(id)) {
      throw new NotFoundException('Mashina topilmadi');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Mashina topilmadi');
    }

    if (vehicle.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu mashinani tahrirlash huquqi yo‘q');
    }

    return vehicle;
  }

  private async ensurePlateFree(userId: string, plateNumber: string, excludeId?: string) {
    const existing = await this.prisma.vehicle.findFirst({
      where: {
        userId,
        plateNumber,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Bu davlat raqami allaqachon qo‘shilgan');
    }
  }

  private normalizePlate(input: string) {
    return input.trim().toUpperCase().replace(/\s+/g, ' ');
  }

  private toView(vehicle: Vehicle) {
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
    };
  }
}
