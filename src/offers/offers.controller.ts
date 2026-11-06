import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OffersService } from './offers.service';

@ApiTags('offers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OffersController {
  constructor(private readonly offers: OffersService) {}

  @Post('cargos/:cargoId/offers')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Yukka taklif berish (haydovchi)' })
  create(
    @Param('cargoId') cargoId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offers.create(cargoId, user, dto);
  }

  @Get('cargos/:cargoId/offers/mine')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Bu yukka mening taklifim' })
  mineForCargo(@Param('cargoId') cargoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.offers.mine(user, cargoId);
  }

  @Get('cargos/:cargoId/offers')
  @Roles(UserRole.CARGO_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'E’longa kelgan takliflar (yuk egasi)' })
  list(@Param('cargoId') cargoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.offers.listForCargo(cargoId, user);
  }

  @Get('offers/mine')
  @Roles(UserRole.DRIVER)
  @ApiQuery({ name: 'cargoId', required: false })
  @ApiOperation({ summary: 'Mening barcha takliflarim (haydovchi)' })
  mine(@CurrentUser() user: AuthenticatedUser, @Query('cargoId') cargoId?: string) {
    return this.offers.mine(user, cargoId);
  }

  @Post('offers/:id/accept')
  @HttpCode(200)
  @Roles(UserRole.CARGO_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Taklifni qabul qilish (yuk egasi)' })
  accept(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.offers.accept(id, user);
  }

  @Post('offers/:id/reject')
  @HttpCode(200)
  @Roles(UserRole.CARGO_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Taklifni rad etish (yuk egasi)' })
  reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.offers.reject(id, user);
  }

  @Post('offers/:id/withdraw')
  @HttpCode(200)
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Taklifni qaytarib olish (haydovchi)' })
  withdraw(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.offers.withdraw(id, user);
  }
}
