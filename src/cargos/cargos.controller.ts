import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentUserOptional } from '../common/decorators/current-user-optional.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CargosService } from './cargos.service';
import { CreateCargoDto } from './dto/create-cargo.dto';
import { ListCargosDto } from './dto/list-cargos.dto';
import { ListMyCargosDto } from './dto/list-my-cargos.dto';
import { UpdateCargoDto } from './dto/update-cargo.dto';

@ApiTags('cargos')
@Controller('cargos')
export class CargosController {
  constructor(private readonly cargos: CargosService) {}

  @Get()
  @ApiOperation({
    summary: 'E’lonlar ro‘yxati (filtr, qidiruv, sahifalash, geo qidiruv)',
    description:
      'Geo qidiruv: nearLat + nearLng + radiusKm yoki minLat, minLng, maxLat, maxLng (bbox).',
  })
  list(@Query() query: ListCargosDto) {
    return this.cargos.list(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mening e’lonlarim (barcha holatlar)' })
  mine(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMyCargosDto) {
    return this.cargos.listMine(user, query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'E’lon tafsiloti' })
  detail(@Param('id') id: string, @CurrentUserOptional() user?: AuthenticatedUser) {
    return this.cargos.findOne(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Yangi e’lon yaratish (moderatsiyaga tushadi)' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCargoDto) {
    return this.cargos.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'E’lonni tahrirlash (e’lon qayta moderatsiyaga tushadi)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCargoDto,
  ) {
    return this.cargos.update(id, user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'E’lonni o‘chirish (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cargos.remove(id, user);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'E’lonni bekor qilish' })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cargos.cancel(id, user);
  }
}
