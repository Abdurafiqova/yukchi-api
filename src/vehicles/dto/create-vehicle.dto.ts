import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: '01 A 777 BA' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9 ]{4,20}$/, {
    message: 'Davlat raqami faqat harflar, raqamlar va bo‘sh joydan iborat bo‘lishi kerak',
  })
  plateNumber!: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.TENT })
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @ApiProperty({ example: 20000, description: 'Yuk ko‘tarish sig‘imi kg' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000)
  capacityKg!: number;

  @ApiPropertyOptional({ example: 82, description: 'Kuzov hajmi m³' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(500)
  bodyVolumeM3?: number;
}
