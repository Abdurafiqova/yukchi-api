import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const CARGO_PAYMENT_METHODS = ['CASH', 'TRANSFER', 'MIXED'] as const;
export type CargoPaymentMethod = (typeof CARGO_PAYMENT_METHODS)[number];

export const CARGO_CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB', 'KZT', 'TRY', 'TJS', 'KGS', 'TMT'] as const;
export type CargoCurrency = (typeof CARGO_CURRENCIES)[number];

export class CargoImageDto {
  @ApiProperty({ example: 'https://cdn.yukchi.uz/cargo/1.jpg' })
  @IsString()
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({ example: 'Yuk ko‘rinishi' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  alt?: string;
}

export class CreateCargoDto {
  @ApiProperty({ example: 'Qurilish materiallari — 20 t' })
  @IsString()
  @MinLength(5)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ example: 'Qurilish materiallari' })
  @IsString()
  @MaxLength(80)
  cargoType!: string;

  @ApiProperty({ example: 20000, description: 'Og‘irlik kg' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  weightKg!: number;

  @ApiPropertyOptional({ example: 40, description: 'Hajm m³' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(500)
  volumeM3?: number;

  @ApiProperty({ enum: VehicleType, example: VehicleType.TENT })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @ApiProperty({ example: 4_500_000, description: 'Narx tanlangan valyutada' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  price!: number;

  @ApiPropertyOptional({ enum: CARGO_CURRENCIES, default: 'UZS' })
  @IsOptional()
  @IsIn(CARGO_CURRENCIES)
  currency?: CargoCurrency;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  priceNegotiable?: boolean;

  @ApiPropertyOptional({ enum: CARGO_PAYMENT_METHODS, default: 'CASH' })
  @IsOptional()
  @IsIn(CARGO_PAYMENT_METHODS)
  paymentMethod?: CargoPaymentMethod;

  @ApiPropertyOptional({ example: 1_000_000, description: 'Avans (so‘m)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  advanceAmount?: number;

  @ApiPropertyOptional({ default: 1, description: 'Kerakli mashinalar soni' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  trucksNeeded?: number;

  @ApiPropertyOptional({ default: false, description: 'Qo‘shimcha yukmi' })
  @IsOptional()
  @IsBoolean()
  isAdditionalLoad?: boolean;

  @ApiPropertyOptional({ default: true, description: 'Yuklashga tayyor' })
  @IsOptional()
  @IsBoolean()
  readyToLoad?: boolean;

  @ApiProperty({ example: 'Toshkent' })
  @IsString()
  @MaxLength(80)
  pickupCity!: string;

  @ApiPropertyOptional({ example: 'Chilonzor, Savdo majmuasi' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  pickupAddress?: string;

  @ApiProperty({ example: 'Samarqand' })
  @IsString()
  @MaxLength(80)
  dropoffCity!: string;

  @ApiPropertyOptional({ example: 'Registon ko‘chasi 12' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dropoffAddress?: string;

  @ApiProperty({
    example: '2026-11-05',
    description: 'Yuklash sanasi (YYYY-MM-DD yoki ISO 8601)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/, {
    message: 'Sana YYYY-MM-DD formatida bo‘lishi kerak',
  })
  pickupDate!: string;

  @ApiPropertyOptional({ type: [CargoImageDto], description: 'Maksimum 8 ta rasm' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => CargoImageDto)
  images?: CargoImageDto[];
}
