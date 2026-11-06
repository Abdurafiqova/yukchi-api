import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { ListDocumentsDto } from '../documents/dto/list-documents.dto';
import { ReviewDocumentDto } from '../documents/dto/review-document.dto';
import { AdminService } from './admin.service';
import {
  ApproveCargoDto,
  ListModerationDto,
  ListUsersDto,
  ListVehiclesDto,
  RejectCargoDto,
  UpdateUserStatusDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platforma statistikasi' })
  stats() {
    return this.admin.stats();
  }

  @Get('cargos')
  @ApiOperation({ summary: 'Moderatsiya navbati (holat bo‘yicha e’lonlar)' })
  listCargos(@Query() query: ListModerationDto) {
    return this.admin.listCargos(query);
  }

  @Post('cargos/:id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'E’lonni tasdiqlash va chop etish' })
  approve(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ApproveCargoDto,
  ) {
    return this.admin.approveCargo(id, admin, dto.note);
  }

  @Post('cargos/:id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'E’lonni rad etish (sababi bilan)' })
  reject(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: RejectCargoDto,
  ) {
    return this.admin.rejectCargo(id, admin, dto.note);
  }

  @Get('users')
  @ApiOperation({ summary: 'Foydalanuvchilar ro‘yxati' })
  listUsers(@Query() query: ListUsersDto) {
    return this.admin.listUsers(query);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Foydalanuvchini bloklash yoki faollashtirish' })
  setUserStatus(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.admin.setUserStatus(id, admin, dto);
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Mashinalar ro‘yxati (moderatsiya uchun)' })
  listVehicles(@Query() query: ListVehiclesDto) {
    return this.admin.listVehicles(query);
  }

  @Post('vehicles/:id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mashinani tasdiqlash (ACTIVE)' })
  approveVehicle(@Param('id') id: string) {
    return this.admin.approveVehicle(id);
  }

  @Post('vehicles/:id/block')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mashinani bloklash (BLOCKED)' })
  blockVehicle(@Param('id') id: string) {
    return this.admin.blockVehicle(id);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Mashina hujjatlari navbati' })
  listDocuments(@Query() query: ListDocumentsDto) {
    return this.admin.listDocuments(query);
  }

  @Post('documents/:id/review')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hujjatni tasdiqlash yoki rad etish' })
  reviewDocument(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: ReviewDocumentDto,
  ) {
    return this.admin.reviewDocument(id, admin, dto);
  }
}
