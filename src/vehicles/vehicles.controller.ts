import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Mening mashinalarim' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.vehicles.list(user);
  }

  @Post()
  @ApiOperation({ summary: 'Mashina qo‘shish (moderatsiyaga tushadi)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mashinani tahrirlash' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicles.update(id, user, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Mashinani o‘chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.vehicles.remove(id, user);
  }
}
