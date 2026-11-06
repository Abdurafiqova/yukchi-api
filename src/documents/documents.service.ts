import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentStatus,
  NotificationType,
  Prisma,
  UserRole,
  VehicleDocumentType,
  VehicleStatus,
} from '@prisma/client';
import { unlink, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { DOCUMENT_LABELS, REQUIRED_DOCUMENT_TYPES, VEHICLE_LABELS } from '../common/constants';
import { isUuid } from '../common/utils/uuid';
import { PrismaService } from '../prisma/prisma.service';
import { DOCUMENT_UPLOAD_DIR, type UploadedDocumentFile } from './document-upload';
import type { ListDocumentsDto } from './dto/list-documents.dto';
import type { ReviewDocumentDto } from './dto/review-document.dto';

const DOCUMENT_ADMIN_INCLUDE = {
  vehicle: {
    select: {
      id: true,
      plateNumber: true,
      vehicleType: true,
      status: true,
      driver: { select: { id: true, phone: true, fullName: true } },
    },
  },
  reviewedBy: { select: { id: true, fullName: true } },
} as const;

type DocumentWithRelations = Prisma.VehicleDocumentGetPayload<{
  include: typeof DOCUMENT_ADMIN_INCLUDE;
}>;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForVehicle(vehicleId: string, user: AuthenticatedUser) {
    const vehicle = await this.requireVehicle(vehicleId, user);
    const docs = await this.prisma.vehicleDocument.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      items: docs.map((doc) => this.toView(doc)),
      required: REQUIRED_DOCUMENT_TYPES,
      complete: this.isComplete(docs),
      vehicleStatus: vehicle.status,
    };
  }

  async upload(
    vehicleId: string,
    user: AuthenticatedUser,
    type: VehicleDocumentType,
    file?: UploadedDocumentFile,
  ) {
    const vehicle = await this.requireVehicle(vehicleId, user);

    if (vehicle.status === VehicleStatus.BLOCKED) {
      throw new ForbiddenException('Bloklangan mashinaga hujjat yuklab bo‘lmaydi');
    }

    if (!file) {
      throw new BadRequestException('Fayl yuklanmadi');
    }

    const existing = await this.prisma.vehicleDocument.findUnique({
      where: { vehicleId_type: { vehicleId, type } },
    });

    let row;
    try {
      row = await this.prisma.vehicleDocument.upsert({
        where: { vehicleId_type: { vehicleId, type } },
        create: {
          vehicleId,
          type,
          filePath: basename(file.filename),
          fileMime: file.mimetype,
          fileSize: file.size,
          originalName: file.originalname,
        },
        update: {
          filePath: basename(file.filename),
          fileMime: file.mimetype,
          fileSize: file.size,
          originalName: file.originalname,
          status: DocumentStatus.PENDING,
          note: null,
          reviewedAt: null,
          reviewedById: null,
        },
      });
    } catch (error) {
      await this.removeFileQuietly(file.filename);
      throw error;
    }

    if (existing) {
      await this.removeFileQuietly(existing.filePath);
    }

    await this.recomputeVehicleStatus(vehicleId);
    return this.toView(row);
  }

  async remove(vehicleId: string, documentId: string, user: AuthenticatedUser) {
    await this.requireVehicle(vehicleId, user);
    const doc = await this.requireDocument(vehicleId, documentId);

    await this.prisma.vehicleDocument.delete({ where: { id: doc.id } });
    await this.removeFileQuietly(doc.filePath);
    await this.recomputeVehicleStatus(vehicleId);

    return { ok: true, id: doc.id };
  }

  async getFile(vehicleId: string, documentId: string, user: AuthenticatedUser) {
    await this.requireVehicle(vehicleId, user);
    const doc = await this.requireDocument(vehicleId, documentId);
    const path = join(DOCUMENT_UPLOAD_DIR, basename(doc.filePath));

    try {
      await stat(path);
    } catch {
      throw new NotFoundException('Fayl topilmadi');
    }

    return { path, fileMime: doc.fileMime, originalName: doc.originalName };
  }

  async listForAdmin(query: ListDocumentsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.VehicleDocumentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.vehicleDocument.count({ where }),
      this.prisma.vehicleDocument.findMany({
        where,
        include: DOCUMENT_ADMIN_INCLUDE,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rows.map((row) => this.toAdminView(row)),
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNext: page * limit < total,
    };
  }

  async review(documentId: string, moderator: AuthenticatedUser, dto: ReviewDocumentDto) {
    if (!isUuid(documentId)) {
      throw new NotFoundException('Hujjat topilmadi');
    }

    const doc = await this.prisma.vehicleDocument.findUnique({
      where: { id: documentId },
      include: DOCUMENT_ADMIN_INCLUDE,
    });

    if (!doc) {
      throw new NotFoundException('Hujjat topilmadi');
    }

    const note = dto.note?.trim() || null;
    if (dto.status === DocumentStatus.REJECTED && !note) {
      throw new BadRequestException('Rad etish sababini yozing');
    }

    const updated = await this.prisma.vehicleDocument.update({
      where: { id: documentId },
      data: {
        status: dto.status,
        note,
        reviewedAt: new Date(),
        reviewedById: moderator.id,
      },
      include: DOCUMENT_ADMIN_INCLUDE,
    });

    const vehicleStatus = await this.recomputeVehicleStatus(doc.vehicleId);
    const approved = dto.status === DocumentStatus.APPROVED;
    const label = `${DOCUMENT_LABELS[doc.type]} · ${doc.vehicle.plateNumber}`;

    await this.prisma.notification.create({
      data: {
        userId: doc.vehicle.driver.id,
        type: NotificationType.MODERATION,
        title: approved ? 'Hujjatingiz tasdiqlandi' : 'Hujjatingiz rad etildi',
        body: note ? `${label} — ${note}` : label,
        payload: { documentId, vehicleId: doc.vehicleId, status: dto.status },
      },
    });

    return { ...this.toAdminView(updated), vehicleStatus };
  }

  private async requireVehicle(vehicleId: string, user: AuthenticatedUser) {
    if (!isUuid(vehicleId)) {
      throw new NotFoundException('Mashina topilmadi');
    }

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) {
      throw new NotFoundException('Mashina topilmadi');
    }

    if (vehicle.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu mashinaning hujjatlariga ruxsat yo‘q');
    }

    return vehicle;
  }

  private async requireDocument(vehicleId: string, documentId: string) {
    if (!isUuid(documentId)) {
      throw new NotFoundException('Hujjat topilmadi');
    }

    const doc = await this.prisma.vehicleDocument.findFirst({
      where: { id: documentId, vehicleId },
    });

    if (!doc) {
      throw new NotFoundException('Hujjat topilmadi');
    }

    return doc;
  }

  private isComplete(docs: { type: VehicleDocumentType; status: DocumentStatus }[]) {
    return REQUIRED_DOCUMENT_TYPES.every((type) =>
      docs.some((doc) => doc.type === type && doc.status === DocumentStatus.APPROVED),
    );
  }

  private async recomputeVehicleStatus(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { status: true },
    });

    if (!vehicle || vehicle.status === VehicleStatus.BLOCKED) {
      return vehicle?.status ?? null;
    }

    const docs = await this.prisma.vehicleDocument.findMany({
      where: { vehicleId, type: { in: REQUIRED_DOCUMENT_TYPES } },
      select: { type: true, status: true },
    });

    const next = this.isComplete(docs) ? VehicleStatus.ACTIVE : VehicleStatus.PENDING;

    if (vehicle.status !== next) {
      await this.prisma.vehicle.update({ where: { id: vehicleId }, data: { status: next } });
    }

    return next;
  }

  private async removeFileQuietly(filePath: string) {
    try {
      await unlink(join(DOCUMENT_UPLOAD_DIR, basename(filePath)));
    } catch {
      // Fayl allaqachon o‘chirilgan bo‘lishi mumkin
    }
  }

  private toView(doc: {
    id: string;
    vehicleId: string;
    type: VehicleDocumentType;
    status: DocumentStatus;
    originalName: string;
    fileMime: string;
    fileSize: number;
    note: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: doc.id,
      vehicleId: doc.vehicleId,
      type: doc.type,
      typeLabel: DOCUMENT_LABELS[doc.type],
      status: doc.status,
      originalName: doc.originalName,
      fileMime: doc.fileMime,
      fileSize: doc.fileSize,
      note: doc.note,
      fileUrl: `/api/v1/vehicles/${doc.vehicleId}/documents/${doc.id}/file`,
      reviewedAt: doc.reviewedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private toAdminView(doc: DocumentWithRelations) {
    return {
      ...this.toView(doc),
      reviewedBy: doc.reviewedBy
        ? { id: doc.reviewedBy.id, fullName: doc.reviewedBy.fullName }
        : null,
      vehicle: {
        id: doc.vehicle.id,
        plateNumber: doc.vehicle.plateNumber,
        vehicleType: doc.vehicle.vehicleType,
        vehicleLabel: VEHICLE_LABELS[doc.vehicle.vehicleType],
        status: doc.vehicle.status,
        driver: {
          id: doc.vehicle.driver.id,
          phone: doc.vehicle.driver.phone,
          fullName: doc.vehicle.driver.fullName,
        },
      },
    };
  }
}
