import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Foydalanuvchining suhbatlari' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.list(user);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'O‘qilmagan xabarlar soni' })
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.chat.unreadCount(user);
  }

  @Get('by-cargo/:cargoId')
  @ApiOperation({ summary: 'Yuk bo‘yicha suhbat (qabul qilingan taklifdan keyin)' })
  byCargo(@Param('cargoId') cargoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.byCargo(cargoId, user);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Suhbat xabarlari' })
  messages(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMessagesDto,
  ) {
    return this.chat.messages(id, user, query);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Xabar yuborish' })
  send(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.chat.send(id, user, dto);
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Suhbatni o‘qilgan deb belgilash' })
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chat.markRead(id, user);
  }
}
