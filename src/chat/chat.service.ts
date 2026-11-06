import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatMessageKind, NotificationType, Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { isUuid } from '../common/utils/uuid';
import { PrismaService } from '../prisma/prisma.service';
import type { ListMessagesDto } from './dto/list-messages.dto';
import type { SendMessageDto } from './dto/send-message.dto';

const USER_BRIEF = {
  id: true,
  fullName: true,
  phone: true,
  companyName: true,
  rating: true,
  ratingCount: true,
} as const;

const CONVERSATION_INCLUDE = {
  cargo: {
    select: {
      id: true,
      code: true,
      title: true,
      pickupCity: true,
      dropoffCity: true,
      status: true,
    },
  },
  owner: { select: USER_BRIEF },
  driver: { select: USER_BRIEF },
  messages: { orderBy: { createdAt: 'desc' }, take: 1 },
} as const;

type ConversationWithRelations = Prisma.ConversationGetPayload<{
  include: typeof CONVERSATION_INCLUDE;
}>;

type UserBrief = {
  id: string;
  fullName: string | null;
  phone: string;
  companyName: string | null;
  rating: Prisma.Decimal;
  ratingCount: number;
};

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser) {
    const rows = await this.prisma.conversation.findMany({
      where: this.participantWhere(user),
      include: CONVERSATION_INCLUDE,
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
    });

    if (!rows.length) {
      return { items: [], total: 0, unreadCount: 0 };
    }

    const unread = await this.prisma.chatMessage.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: rows.map((row) => row.id) },
        readAt: null,
        NOT: { senderId: user.id },
      },
      _count: { _all: true },
    });

    const unreadByConversation = new Map(unread.map((row) => [row.conversationId, row._count._all]));

    const items = rows.map((row) => {
      const last = row.messages[0];
      return {
        id: row.id,
        cargo: {
          id: row.cargo.id,
          code: row.cargo.code,
          title: row.cargo.title,
          from: row.cargo.pickupCity,
          to: row.cargo.dropoffCity,
          status: row.cargo.status,
        },
        counterpart: this.counterpart(row, user),
        lastMessage: last ? this.messageView(last, user) : null,
        unreadCount: unreadByConversation.get(row.id) ?? 0,
        updatedAt: row.lastMessageAt ?? row.updatedAt,
      };
    });

    return {
      items,
      total: items.length,
      unreadCount: items.reduce((sum, item) => sum + item.unreadCount, 0),
    };
  }

  async unreadCount(user: AuthenticatedUser) {
    const conversations = await this.prisma.conversation.findMany({
      where: this.participantWhere(user),
      select: { id: true },
    });

    if (!conversations.length) return { count: 0 };

    const count = await this.prisma.chatMessage.count({
      where: {
        conversationId: { in: conversations.map((row) => row.id) },
        readAt: null,
        NOT: { senderId: user.id },
      },
    });

    return { count };
  }

  async byCargo(cargoId: string, user: AuthenticatedUser) {
    if (!isUuid(cargoId)) {
      throw new NotFoundException('Chat topilmadi');
    }

    const row = await this.prisma.conversation.findFirst({
      where: { cargoId, ...this.participantWhere(user) },
      include: CONVERSATION_INCLUDE,
    });

    if (!row) {
      throw new NotFoundException('Chat topilmadi');
    }

    return this.conversationView(row, user);
  }

  async messages(conversationId: string, user: AuthenticatedUser, query: ListMessagesDto) {
    const conversation = await this.requireConversation(conversationId, user);
    const limit = query.limit ?? 50;

    const rows = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      conversation: {
        id: conversation.id,
        cargoId: conversation.cargoId,
        counterpart: this.counterpart(conversation, user),
      },
      items: page.reverse().map((row) => ({
        ...this.messageView(row, user),
        mine: row.senderId === user.id,
      })),
      hasMore,
    };
  }

  async send(conversationId: string, user: AuthenticatedUser, dto: SendMessageDto) {
    const conversation = await this.requireConversation(conversationId, user);
    const text = dto.text.trim();
    if (!text) {
      throw new BadRequestException('Xabar matni bo‘sh');
    }

    const recipientId =
      conversation.ownerId === user.id ? conversation.driverId : conversation.ownerId;

    const message = await this.prisma.$transaction(async (tx) => {
      const row = await tx.chatMessage.create({
        data: {
          conversationId,
          senderId: user.id,
          kind: ChatMessageKind.TEXT,
          text,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: row.createdAt },
      });

      await tx.notification.create({
        data: {
          userId: recipientId,
          type: NotificationType.MESSAGE,
          title: 'Yangi xabar',
          body: text.length > 140 ? `${text.slice(0, 137)}…` : text,
          payload: {
            conversationId,
            cargoId: conversation.cargoId,
            senderId: user.id,
          },
        },
      });

      return row;
    });

    return { ...this.messageView(message, user), mine: true };
  }

  async markRead(conversationId: string, user: AuthenticatedUser) {
    await this.requireConversation(conversationId, user);

    const result = await this.prisma.chatMessage.updateMany({
      where: { conversationId, readAt: null, NOT: { senderId: user.id } },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  private participantWhere(user: AuthenticatedUser): Prisma.ConversationWhereInput {
    if (user.role === UserRole.DRIVER) return { driverId: user.id };
    if (user.role === UserRole.CARGO_OWNER) return { ownerId: user.id };
    return { OR: [{ ownerId: user.id }, { driverId: user.id }] };
  }

  private async requireConversation(conversationId: string, user: AuthenticatedUser) {
    if (!isUuid(conversationId)) {
      throw new NotFoundException('Chat topilmadi');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: CONVERSATION_INCLUDE,
    });

    if (!conversation) {
      throw new NotFoundException('Chat topilmadi');
    }

    if (conversation.ownerId !== user.id && conversation.driverId !== user.id) {
      throw new ForbiddenException('Bu chatga ruxsat yo‘q');
    }

    return conversation;
  }

  private conversationView(row: ConversationWithRelations, user: AuthenticatedUser) {
    return {
      id: row.id,
      cargo: {
        id: row.cargo.id,
        code: row.cargo.code,
        title: row.cargo.title,
        from: row.cargo.pickupCity,
        to: row.cargo.dropoffCity,
        status: row.cargo.status,
      },
      counterpart: this.counterpart(row, user),
      updatedAt: row.lastMessageAt ?? row.updatedAt,
    };
  }

  private counterpart(row: ConversationWithRelations, user: AuthenticatedUser) {
    const isOwner = row.ownerId === user.id;
    const brief: UserBrief = isOwner ? row.driver : row.owner;
    return {
      id: brief.id,
      name: brief.fullName || brief.phone,
      phone: brief.phone,
      companyName: brief.companyName,
      rating: Number(brief.rating),
      ratingCount: brief.ratingCount,
      role: isOwner ? UserRole.DRIVER : UserRole.CARGO_OWNER,
    };
  }

  private messageView(
    row: {
      id: string;
      conversationId: string;
      senderId: string;
      kind: ChatMessageKind;
      text: string | null;
      readAt: Date | null;
      createdAt: Date;
    },
    user: AuthenticatedUser,
  ) {
    return {
      id: row.id,
      conversationId: row.conversationId,
      senderId: row.senderId,
      kind: row.kind,
      text: row.text,
      readAt: row.readAt,
      createdAt: row.createdAt,
      mine: row.senderId === user.id,
    };
  }
}
