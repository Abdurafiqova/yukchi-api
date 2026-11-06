import { Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Foydalanuvchi bildirishnomalari' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsDto) {
    return this.notifications.list(user, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'O‘qilmagan bildirishnomalar soni' })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.unreadCount(user);
  }

  @Post('read-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Barcha bildirishnomalarni o‘qilgan qilish' })
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user);
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Bitta bildirishnomani o‘qilgan qilish' })
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markRead(id, user);
  }
}
