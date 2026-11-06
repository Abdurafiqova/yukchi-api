import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { VEHICLE_LABELS } from '../common/constants';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('cities')
  @ApiOperation({ summary: 'Faol shaharlar ro‘yxati (koordinatalar bilan)' })
  listCities() {
    return this.locations.listCities();
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Mashina turlari (enum + o‘zbekcha nom)' })
  listVehicleTypes() {
    return Object.entries(VEHICLE_LABELS).map(([value, label]) => ({ value, label }));
  }

  @Get('cargo-types')
  @ApiOperation({ summary: 'Yuk toifalari ro‘yxati' })
  listCargoTypes() {
    return this.locations.listCargoTypes();
  }
}
