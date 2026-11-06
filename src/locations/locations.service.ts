import { Injectable } from '@nestjs/common';
import { CARGO_TYPES } from '../common/constants';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCities() {
    const cities = await this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, region: true, lat: true, lng: true },
    });

    return cities.map((city) => ({
      id: city.id,
      name: city.name,
      region: city.region,
      lat: Number(city.lat),
      lng: Number(city.lng),
    }));
  }

  listCargoTypes() {
    return CARGO_TYPES.map((name) => ({ value: name, label: name }));
  }
}
