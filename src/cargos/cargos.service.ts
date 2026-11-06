import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  Cargo,
  CargoStatus,
  ModerationAction,
  NotificationType,
  Prisma,
  UserRole,
  VehicleType,
} from '@prisma/client';
import { randomInt } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CARGO_CODE_PREFIX, PUBLISH_WINDOW_DAYS, VEHICLE_LABELS } from '../common/constants';
import { isUuid } from '../common/utils/uuid';
import { PrismaService } from '../prisma/prisma.service';
import type { CargoImageDto, CreateCargoDto } from './dto/create-cargo.dto';
import type { ListCargosDto } from './dto/list-cargos.dto';
import type { ListMyCargosDto } from './dto/list-my-cargos.dto';
import type { UpdateCargoDto } from './dto/update-cargo.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const EDITABLE_STATUSES: CargoStatus[] = [
  CargoStatus.DRAFT,
  CargoStatus.PENDING_REVIEW,
  CargoStatus.PUBLISHED,
  CargoStatus.REJECTED,
];

const OWNER_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  companyName: true,
  rating: true,
  ratingCount: true,
} as const;

const CARGO_INCLUDE = {
  owner: { select: OWNER_SELECT },
  images: { orderBy: { sortOrder: 'asc' as const } },
} as const;

type OwnerRow = {
  id: string;
  fullName: string | null;
  phone: string;
  companyName: string | null;
  rating: Prisma.Decimal;
  ratingCount: number;
};

type ImageRow = { id: string; url: string; alt: string | null };

type CargoWithRelations = Cargo & { owner: OwnerRow; images: ImageRow[] };

type PointRow = {
  id: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
};

type CityRow = { id: string; name: string; lat: Prisma.Decimal; lng: Prisma.Decimal };

type GeoQuery = { lat: number; lng: number; radiusM: number } | { envelope: [number, number, number, number] };

@Injectable()
export class CargosService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListCargosDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const geo = this.readGeo(query);

    if (geo) {
      return this.listGeo(query, geo, page, limit);
    }

    const where = this.buildListWhere(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.cargo.count({ where }),
      this.prisma.cargo.findMany({
        where,
        include: CARGO_INCLUDE,
        orderBy: this.prismaOrder(query.sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const points = await this.loadPoints(rows.map((row) => row.id));

    return this.paginate(
      rows.map((row) => this.toView(row, points.get(row.id), { includePhone: false })),
      total,
      page,
      limit,
    );
  }

  async findOne(id: string, viewer?: AuthenticatedUser) {
    if (!isUuid(id)) {
      throw new NotFoundException('E’lon topilmadi');
    }

    const cargo = await this.prisma.cargo.findFirst({
      where: { id, deletedAt: null },
      include: CARGO_INCLUDE,
    });

    if (!cargo) {
      throw new NotFoundException('E’lon topilmadi');
    }

    const isOwner = viewer?.id === cargo.ownerId;
    const isAdmin = viewer?.role === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      const expired = cargo.expiresAt ? cargo.expiresAt.getTime() <= Date.now() : false;
      if (cargo.status !== CargoStatus.PUBLISHED || expired) {
        throw new NotFoundException('E’lon topilmadi');
      }

      await this.prisma.cargo.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
      cargo.viewCount += 1;
    }

    const points = await this.loadPoints([id]);

    return this.toView(cargo, points.get(id), {
      includePhone: true,
      includeModeration: isOwner || isAdmin,
    });
  }

  async listMine(user: AuthenticatedUser, query: ListMyCargosDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.CargoWhereInput = {
      ownerId: user.id,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.cargo.count({ where }),
      this.prisma.cargo.findMany({
        where,
        include: CARGO_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const points = await this.loadPoints(rows.map((row) => row.id));

    return this.paginate(
      rows.map((row) =>
        this.toView(row, points.get(row.id), { includePhone: true, includeModeration: true }),
      ),
      total,
      page,
      limit,
    );
  }

  async create(user: AuthenticatedUser, dto: CreateCargoDto) {
    const pickup = await this.requireCity(dto.pickupCity);
    const dropoff = await this.requireCity(dto.dropoffCity);

    if (pickup.id === dropoff.id) {
      throw new BadRequestException('Qayerdan va qayerga shaharlari bir xil bo‘lishi mumkin emas');
    }

    const pickupDate = this.parsePickupDate(dto.pickupDate);
    if (pickupDate.getTime() < Date.now() - DAY_MS) {
      throw new BadRequestException('Yuklash sanasi o‘tmishda bo‘lishi mumkin emas');
    }

    const code = await this.nextCode();
    const expiresAt = new Date(pickupDate.getTime() + PUBLISH_WINDOW_DAYS * DAY_MS);

    const cargo = await this.prisma.cargo.create({
      data: {
        code,
        ownerId: user.id,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        cargoType: dto.cargoType.trim(),
        weightKg: dto.weightKg,
        volumeM3: dto.volumeM3 ?? null,
        vehicleType: dto.vehicleType,
        price: dto.price,
        currency: dto.currency ?? 'UZS',
        priceNegotiable: dto.priceNegotiable ?? false,
        paymentMethod: dto.paymentMethod ?? 'CASH',
        advanceAmount: dto.advanceAmount ?? null,
        trucksNeeded: dto.trucksNeeded ?? 1,
        isAdditionalLoad: dto.isAdditionalLoad ?? false,
        readyToLoad: dto.readyToLoad ?? true,
        status: CargoStatus.PENDING_REVIEW,
        pickupCity: pickup.name,
        pickupAddress: dto.pickupAddress?.trim() || null,
        dropoffCity: dropoff.name,
        dropoffAddress: dto.dropoffAddress?.trim() || null,
        pickupDate,
        expiresAt,
        images: dto.images?.length ? { create: this.imageRows(dto.images) } : undefined,
      },
      include: CARGO_INCLUDE,
    });

    await this.setPoints(cargo.id, pickup, dropoff);

    const points = await this.loadPoints([cargo.id]);

    return this.toView(cargo, points.get(cargo.id), {
      includePhone: true,
      includeModeration: true,
    });
  }

  async update(id: string, user: AuthenticatedUser, dto: UpdateCargoDto) {
    if (!isUuid(id)) {
      throw new NotFoundException('E’lon topilmadi');
    }

    const cargo = await this.prisma.cargo.findFirst({ where: { id, deletedAt: null } });
    if (!cargo) {
      throw new NotFoundException('E’lon topilmadi');
    }

    if (cargo.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu e’lonni tahrirlash huquqi yo‘q');
    }

    if (!EDITABLE_STATUSES.includes(cargo.status)) {
      throw new BadRequestException('Bu holatdagi e’lonni tahrirlash mumkin emas');
    }

    const pickup = dto.pickupCity ? await this.requireCity(dto.pickupCity) : null;
    const dropoff = dto.dropoffCity ? await this.requireCity(dto.dropoffCity) : null;

    const pickupCity = pickup?.name ?? cargo.pickupCity;
    const dropoffCity = dropoff?.name ?? cargo.dropoffCity;

    if (pickupCity === dropoffCity) {
      throw new BadRequestException('Qayerdan va qayerga shaharlari bir xil bo‘lishi mumkin emas');
    }

    const pickupDate = dto.pickupDate ? this.parsePickupDate(dto.pickupDate) : cargo.pickupDate;
    const resubmit = cargo.status === CargoStatus.PUBLISHED || cargo.status === CargoStatus.REJECTED;
    const expiresAt = new Date(pickupDate.getTime() + PUBLISH_WINDOW_DAYS * DAY_MS);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.cargoImage.deleteMany({ where: { cargoId: id } });
      }

      return tx.cargo.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
          ...(dto.cargoType !== undefined ? { cargoType: dto.cargoType.trim() } : {}),
          ...(dto.weightKg !== undefined ? { weightKg: dto.weightKg } : {}),
          ...(dto.volumeM3 !== undefined ? { volumeM3: dto.volumeM3 } : {}),
          ...(dto.vehicleType !== undefined ? { vehicleType: dto.vehicleType } : {}),
          ...(dto.price !== undefined ? { price: dto.price } : {}),
          ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
          ...(dto.priceNegotiable !== undefined ? { priceNegotiable: dto.priceNegotiable } : {}),
          ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
          ...(dto.advanceAmount !== undefined ? { advanceAmount: dto.advanceAmount } : {}),
          ...(dto.trucksNeeded !== undefined ? { trucksNeeded: dto.trucksNeeded } : {}),
          ...(dto.isAdditionalLoad !== undefined
            ? { isAdditionalLoad: dto.isAdditionalLoad }
            : {}),
          ...(dto.readyToLoad !== undefined ? { readyToLoad: dto.readyToLoad } : {}),
          ...(dto.pickupAddress !== undefined
            ? { pickupAddress: dto.pickupAddress?.trim() || null }
            : {}),
          ...(dto.dropoffAddress !== undefined
            ? { dropoffAddress: dto.dropoffAddress?.trim() || null }
            : {}),
          pickupCity,
          dropoffCity,
          pickupDate,
          expiresAt,
          ...(resubmit
            ? {
                status: CargoStatus.PENDING_REVIEW,
                publishedAt: null,
                moderationNote: null,
              }
            : {}),
          ...(dto.images ? { images: { create: this.imageRows(dto.images) } } : {}),
        },
        include: CARGO_INCLUDE,
      });
    });

    if (pickup || dropoff) {
      const pickupRow = pickup ?? (await this.requireCity(cargo.pickupCity));
      const dropoffRow = dropoff ?? (await this.requireCity(cargo.dropoffCity));
      await this.setPoints(id, pickupRow, dropoffRow);
    }

    const points = await this.loadPoints([id]);

    return this.toView(updated, points.get(id), {
      includePhone: true,
      includeModeration: true,
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    if (!isUuid(id)) {
      throw new NotFoundException('E’lon topilmadi');
    }

    const cargo = await this.prisma.cargo.findFirst({ where: { id, deletedAt: null } });
    if (!cargo) {
      throw new NotFoundException('E’lon topilmadi');
    }

    if (cargo.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu e’lonni o‘chirish huquqi yo‘q');
    }

    if (!EDITABLE_STATUSES.includes(cargo.status)) {
      throw new BadRequestException('Bu holatdagi e’lonni o‘chirish mumkin emas');
    }

    await this.prisma.cargo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { ok: true, id };
  }

  async cancel(id: string, user: AuthenticatedUser) {
    if (!isUuid(id)) {
      throw new NotFoundException('E’lon topilmadi');
    }

    const cargo = await this.prisma.cargo.findFirst({ where: { id, deletedAt: null } });
    if (!cargo) {
      throw new NotFoundException('E’lon topilmadi');
    }

    if (cargo.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu e’lonni bekor qilish huquqi yo‘q');
    }

    const cancellable: CargoStatus[] = [
      CargoStatus.PENDING_REVIEW,
      CargoStatus.PUBLISHED,
      CargoStatus.IN_PROGRESS,
    ];

    if (!cancellable.includes(cargo.status)) {
      throw new BadRequestException('Bu holatdagi e’lonni bekor qilish mumkin emas');
    }

    await this.prisma.cargo.update({
      where: { id },
      data: { status: CargoStatus.CANCELLED },
    });

    return { ok: true, id, status: CargoStatus.CANCELLED };
  }

  async listForModeration(status: CargoStatus | 'ALL' = CargoStatus.PENDING_REVIEW, page = 1, limit = 20) {
    const where: Prisma.CargoWhereInput = {
      deletedAt: null,
      ...(status === 'ALL' ? {} : { status }),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.cargo.count({ where }),
      this.prisma.cargo.findMany({
        where,
        include: CARGO_INCLUDE,
        orderBy: { createdAt: status === 'ALL' ? 'desc' : 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const points = await this.loadPoints(rows.map((row) => row.id));

    return this.paginate(
      rows.map((row) =>
        this.toView(row, points.get(row.id), { includePhone: true, includeModeration: true }),
      ),
      total,
      page,
      limit,
    );
  }

  async approve(id: string, moderator: AuthenticatedUser, note?: string) {
    const cargo = await this.requireModerationCargo(id);
    const now = new Date();
    const expiresAt = new Date(
      Math.max(now.getTime() + PUBLISH_WINDOW_DAYS * DAY_MS, cargo.pickupDate.getTime() + PUBLISH_WINDOW_DAYS * DAY_MS),
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const cargoRow = await tx.cargo.update({
        where: { id },
        data: {
          status: CargoStatus.PUBLISHED,
          publishedAt: now,
          expiresAt,
          moderationNote: note?.trim() || null,
        },
        include: CARGO_INCLUDE,
      });

      await tx.moderationLog.create({
        data: {
          cargoId: id,
          moderatorId: moderator.id,
          action: ModerationAction.APPROVE,
          note: note?.trim() || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: cargo.ownerId,
          type: NotificationType.MODERATION,
          title: 'E’loningiz tasdiqlandi',
          body: `${cargoRow.code} — ${cargoRow.title}`,
          payload: { cargoId: cargoRow.id },
        },
      });

      return cargoRow;
    });

    const points = await this.loadPoints([id]);
    return this.toView(updated, points.get(id), {
      includePhone: true,
      includeModeration: true,
    });
  }

  async reject(id: string, moderator: AuthenticatedUser, note: string) {
    const cargo = await this.requireModerationCargo(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const cargoRow = await tx.cargo.update({
        where: { id },
        data: { status: CargoStatus.REJECTED, moderationNote: note.trim() },
        include: CARGO_INCLUDE,
      });

      await tx.moderationLog.create({
        data: {
          cargoId: id,
          moderatorId: moderator.id,
          action: ModerationAction.REJECT,
          note: note.trim(),
        },
      });

      await tx.notification.create({
        data: {
          userId: cargo.ownerId,
          type: NotificationType.MODERATION,
          title: 'E’lon rad etildi',
          body: note.trim(),
          payload: { cargoId: cargoRow.id },
        },
      });

      return cargoRow;
    });

    const points = await this.loadPoints([id]);
    return this.toView(updated, points.get(id), {
      includePhone: true,
      includeModeration: true,
    });
  }

  private async requireModerationCargo(id: string) {
    if (!isUuid(id)) {
      throw new NotFoundException('E’lon topilmadi');
    }

    const cargo = await this.prisma.cargo.findFirst({ where: { id, deletedAt: null } });
    if (!cargo) {
      throw new NotFoundException('E’lon topilmadi');
    }

    return cargo;
  }

  private readGeo(query: ListCargosDto): GeoQuery | null {
    const hasNear = query.nearLat !== undefined || query.nearLng !== undefined;
    const hasBbox =
      query.minLat !== undefined ||
      query.minLng !== undefined ||
      query.maxLat !== undefined ||
      query.maxLng !== undefined;

    if (hasNear) {
      if (query.nearLat === undefined || query.nearLng === undefined) {
        throw new BadRequestException('nearLat va nearLng birga berilishi kerak');
      }
      return {
        lat: query.nearLat,
        lng: query.nearLng,
        radiusM: (query.radiusKm ?? 50) * 1000,
      };
    }

    if (hasBbox) {
      if (
        query.minLat === undefined ||
        query.minLng === undefined ||
        query.maxLat === undefined ||
        query.maxLng === undefined
      ) {
        throw new BadRequestException('Bounding box uchun minLat, minLng, maxLat, maxLng kerak');
      }
      return {
        envelope: [query.minLng, query.minLat, query.maxLng, query.maxLat],
      };
    }

    return null;
  }

  private buildListWhere(query: ListCargosDto): Prisma.CargoWhereInput {
    const now = new Date();
    const and: Prisma.CargoWhereInput[] = [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    ];

    if (query.q) {
      const contains = query.q.trim();
      and.push({
        OR: [
          { title: { contains, mode: 'insensitive' } },
          { description: { contains, mode: 'insensitive' } },
          { cargoType: { contains, mode: 'insensitive' } },
        ],
      });
    }

    if (query.from) and.push({ pickupCity: { equals: query.from.trim(), mode: 'insensitive' } });
    if (query.to) and.push({ dropoffCity: { equals: query.to.trim(), mode: 'insensitive' } });
    if (query.vehicleType) and.push({ vehicleType: query.vehicleType });
    if (query.minWeightKg !== undefined) and.push({ weightKg: { gte: query.minWeightKg } });
    if (query.maxPrice !== undefined) and.push({ price: { lte: query.maxPrice } });

    return {
      deletedAt: null,
      status: CargoStatus.PUBLISHED,
      AND: and,
    };
  }

  private async listGeo(query: ListCargosDto, geo: GeoQuery, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const near = 'lat' in geo;

    const parts: Prisma.Sql[] = [
      Prisma.sql`c.deleted_at IS NULL`,
      Prisma.sql`c.status = ${CargoStatus.PUBLISHED}::"CargoStatus"`,
      Prisma.sql`(c.expires_at IS NULL OR c.expires_at > now())`,
      Prisma.sql`c.pickup_point IS NOT NULL`,
    ];

    if (query.q) {
      const like = `%${query.q.trim()}%`;
      parts.push(
        Prisma.sql`(c.title ILIKE ${like} OR c.description ILIKE ${like} OR c.cargo_type ILIKE ${like})`,
      );
    }
    if (query.from) parts.push(Prisma.sql`c.pickup_city ILIKE ${query.from.trim()}`);
    if (query.to) parts.push(Prisma.sql`c.dropoff_city ILIKE ${query.to.trim()}`);
    if (query.vehicleType) parts.push(Prisma.sql`c.vehicle_type::text = ${query.vehicleType}`);
    if (query.minWeightKg !== undefined) parts.push(Prisma.sql`c.weight_kg >= ${query.minWeightKg}`);
    if (query.maxPrice !== undefined) parts.push(Prisma.sql`c.price <= ${query.maxPrice}`);

    const geoFilter = near
      ? Prisma.sql`ST_DWithin(
          c.pickup_point,
          ST_SetSRID(ST_MakePoint(${geo.lng}, ${geo.lat}), 4326)::geography,
          ${geo.radiusM}
        )`
      : Prisma.sql`ST_Intersects(
          c.pickup_point,
          ST_MakeEnvelope(${geo.envelope[0]}, ${geo.envelope[1]}, ${geo.envelope[2]}, ${geo.envelope[3]}, 4326)::geography
        )`;

    parts.push(geoFilter);

    const whereSql = Prisma.join(parts, ' AND ');
    const distanceExpr = near
      ? Prisma.sql`ST_Distance(
          c.pickup_point,
          ST_SetSRID(ST_MakePoint(${geo.lng}, ${geo.lat}), 4326)::geography
        )`
      : Prisma.sql`NULL::float8`;

    const ids = await this.prisma.$queryRaw<{ id: string; distance_m: number | null }[]>(
      Prisma.sql`
        SELECT c.id, ${distanceExpr} AS distance_m
        FROM cargos c
        WHERE ${whereSql}
        ORDER BY ${this.sqlOrder(query.sort, near)}
        LIMIT ${limit} OFFSET ${offset}
      `,
    );

    const counted = await this.prisma.$queryRaw<{ count: bigint }[]>(
      Prisma.sql`SELECT count(*)::bigint AS count FROM cargos c WHERE ${whereSql}`,
    );
    const total = Number(counted[0]?.count ?? 0);

    if (!ids.length) {
      return this.paginate([], total, page, limit);
    }

    const rows = await this.prisma.cargo.findMany({
      where: { id: { in: ids.map((row) => row.id) } },
      include: CARGO_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const points = await this.loadPoints(ids.map((row) => row.id));
    const distanceById = new Map(ids.map((row) => [row.id, row.distance_m]));

    const items = ids
      .map((row) => {
        const cargo = byId.get(row.id);
        if (!cargo) return null;
        const distance = distanceById.get(row.id);
        return this.toView(cargo, points.get(row.id), {
          includePhone: false,
          distanceM: distance ?? undefined,
        });
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return this.paginate(items, total, page, limit);
  }

  private sqlOrder(sort: ListCargosDto['sort'], near: boolean): Prisma.Sql {
    if (near) return Prisma.sql`distance_m ASC`;

    switch (sort) {
      case 'price_asc':
        return Prisma.sql`c.price ASC, c.published_at DESC`;
      case 'price_desc':
        return Prisma.sql`c.price DESC, c.published_at DESC`;
      case 'weight_desc':
        return Prisma.sql`c.weight_kg DESC, c.published_at DESC`;
      default:
        return Prisma.sql`c.published_at DESC NULLS LAST, c.created_at DESC`;
    }
  }

  private prismaOrder(sort?: ListCargosDto['sort']): Prisma.CargoOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ price: 'asc' }, { publishedAt: 'desc' }];
      case 'price_desc':
        return [{ price: 'desc' }, { publishedAt: 'desc' }];
      case 'weight_desc':
        return [{ weightKg: 'desc' }, { publishedAt: 'desc' }];
      default:
        return [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
    }
  }

  private async loadPoints(ids: string[]) {
    const map = new Map<string, PointRow>();
    if (!ids.length) return map;

    const rows = await this.prisma.$queryRaw<PointRow[]>`
      SELECT id,
        ST_Y(pickup_point::geometry) AS pickup_lat,
        ST_X(pickup_point::geometry) AS pickup_lng,
        ST_Y(dropoff_point::geometry) AS dropoff_lat,
        ST_X(dropoff_point::geometry) AS dropoff_lng
      FROM cargos
      WHERE id = ANY(${ids}::uuid[])
    `;

    for (const row of rows) map.set(row.id, row);
    return map;
  }

  private async setPoints(cargoId: string, pickup: CityRow, dropoff: CityRow) {
    await this.prisma.$executeRaw`
      UPDATE cargos
      SET pickup_point = ST_SetSRID(ST_MakePoint(${Number(pickup.lng)}, ${Number(pickup.lat)}), 4326)::geography,
          dropoff_point = ST_SetSRID(ST_MakePoint(${Number(dropoff.lng)}, ${Number(dropoff.lat)}), 4326)::geography
      WHERE id = ${cargoId}::uuid
    `;
  }

  private async requireCity(input: string): Promise<CityRow> {
    const value = input.trim();
    const city = await this.prisma.city.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: value.toLowerCase() },
          { name: { equals: value, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, lat: true, lng: true },
    });

    if (!city) {
      throw new BadRequestException(`Shahar topilmadi: ${value}`);
    }

    return city;
  }

  private parsePickupDate(value: string): Date {
    const raw = value.trim();
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T09:00:00+05:00`)
      : new Date(raw);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Sana formati noto‘g‘ri');
    }

    return date;
  }

  private imageRows(images: CargoImageDto[]) {
    return images.map((image, index) => ({
      url: image.url.trim(),
      alt: image.alt?.trim() || null,
      sortOrder: index,
    }));
  }

  private async nextCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `${CARGO_CODE_PREFIX}${randomInt(100_000, 1_000_000)}`;
      const exists = await this.prisma.cargo.findUnique({ where: { code }, select: { id: true } });
      if (!exists) return code;
    }

    throw new InternalServerErrorException('E’lon kodi yaratishda xatolik. Qayta urinib ko‘ring');
  }

  private paginate<T>(items: T[], total: number, page: number, limit: number) {
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNext: page * limit < total,
    };
  }

  private toView(
    cargo: CargoWithRelations,
    point?: PointRow,
    options: { includePhone: boolean; includeModeration?: boolean; distanceM?: number } = {
      includePhone: false,
    },
  ) {
    return {
      id: cargo.id,
      code: cargo.code,
      title: cargo.title,
      description: cargo.description,
      cargoType: cargo.cargoType,
      weightKg: cargo.weightKg,
      volumeM3: cargo.volumeM3 ? Number(cargo.volumeM3) : null,
      vehicleType: cargo.vehicleType,
      vehicleLabel: VEHICLE_LABELS[cargo.vehicleType],
      price: cargo.price,
      currency: cargo.currency,
      priceNegotiable: cargo.priceNegotiable,
      paymentMethod: cargo.paymentMethod,
      advanceAmount: cargo.advanceAmount,
      trucksNeeded: cargo.trucksNeeded,
      isAdditionalLoad: cargo.isAdditionalLoad,
      readyToLoad: cargo.readyToLoad,
      status: cargo.status,
      pickup: {
        city: cargo.pickupCity,
        address: cargo.pickupAddress,
        lat: point?.pickup_lat ?? null,
        lng: point?.pickup_lng ?? null,
      },
      dropoff: {
        city: cargo.dropoffCity,
        address: cargo.dropoffAddress,
        lat: point?.dropoff_lat ?? null,
        lng: point?.dropoff_lng ?? null,
      },
      pickupDate: cargo.pickupDate,
      publishedAt: cargo.publishedAt,
      expiresAt: cargo.expiresAt,
      viewCount: cargo.viewCount,
      offerCount: cargo.offerCount,
      images: cargo.images.map((image) => ({
        id: image.id,
        url: image.url,
        alt: image.alt,
      })),
      owner: {
        id: cargo.owner.id,
        name: cargo.owner.fullName ?? cargo.owner.companyName ?? 'Yukchi foydalanuvchisi',
        companyName: cargo.owner.companyName,
        rating: Number(cargo.owner.rating),
        ratingCount: cargo.owner.ratingCount,
        ...(options.includePhone ? { phone: cargo.owner.phone } : {}),
      },
      ...(options.includeModeration ? { moderationNote: cargo.moderationNote } : {}),
      ...(options.distanceM !== undefined
        ? { distanceKm: Math.round((options.distanceM / 1000) * 10) / 10 }
        : {}),
      createdAt: cargo.createdAt,
      updatedAt: cargo.updatedAt,
    };
  }
}
