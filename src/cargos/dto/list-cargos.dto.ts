import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CARGO_SORTS = ['new', 'price_asc', 'price_desc', 'weight_desc', 'distance'] as const;
export type CargoSort = (typeof CARGO_SORTS)[number];

export class ListCargosDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;

  @ApiPropertyOptional({ description: 'Matn bo‘yicha qidiruv (nom, izoh, yuk turi)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ example: 'Toshkent' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  from?: string;

  @ApiPropertyOptional({ example: 'Samarqand' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  to?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ description: 'Minimal og‘irlik (kg)', example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minWeightKg?: number;

  @ApiPropertyOptional({ description: 'Maksimal narx (so‘m)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: CARGO_SORTS, default: 'new' })
  @IsOptional()
  @IsIn(CARGO_SORTS)
  sort?: CargoSort;

  @ApiPropertyOptional({ description: 'Nuqta yaqinidagi yuklar: kenglik' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  nearLat?: number;

  @ApiPropertyOptional({ description: 'Nuqta yaqinidagi yuklar: uzunlik' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  nearLng?: number;

  @ApiPropertyOptional({ default: 50, description: 'Radius (km), nearLat/nearLng bilan' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  radiusKm?: number;

  @ApiPropertyOptional({ description: 'Bounding box: janubiy kenglik' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minLat?: number;

  @ApiPropertyOptional({ description: 'Bounding box: g‘arbiy uzunlik' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minLng?: number;

  @ApiPropertyOptional({ description: 'Bounding box: shimoliy kenglik' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxLat?: number;

  @ApiPropertyOptional({ description: 'Bounding box: sharqiy uzunlik' })
  @IsOptional()
  @Type(() => Number)
  maxLng?: number;
}
