import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { isUuid } from '../common/utils/uuid';
import { PrismaService } from '../prisma/prisma.service';
import type { ListNotificationsDto } from './dto/list-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, query: ListNotificationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { userId: user.id };

    const [total, unreadCount, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: rows,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      hasNext: page * limit < total,
    };
  }

  async unreadCount(user: AuthenticatedUser) {
    const count = await this.prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });
    return { count };
  }

  async markRead(id: string, user: AuthenticatedUser) {
    if (!isUuid(id)) {
      throw new NotFoundException('Bildirishnoma topilmadi');
    }

    const result = await this.prisma.notification.updateMany({
      where: { id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    if (!result.count) {
      const exists = await this.prisma.notification.findFirst({
        where: { id, userId: user.id },
        select: { id: true, readAt: true },
      });
      if (!exists) {
        throw new NotFoundException('Bildirishnoma topilmadi');
      }
    }

    return { id, read: true };
  }

  async markAllRead(user: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }
}
