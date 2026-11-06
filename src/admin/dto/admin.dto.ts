import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CargoStatus, UserRole, UserStatus, VehicleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ListModerationDto {
  @ApiPropertyOptional({
    enum: [...Object.values(CargoStatus), 'ALL'],
    default: CargoStatus.PENDING_REVIEW,
  })
  @IsOptional()
  @IsIn([...Object.values(CargoStatus), 'ALL'])
  status: CargoStatus | 'ALL' = CargoStatus.PENDING_REVIEW;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}

export class ApproveCargoDto {
  @ApiPropertyOptional({ example: 'Tekshirildi, e’lon qilindi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectCargoDto {
  @ApiProperty({ example: 'Telefon raqami noto‘g‘ri / rasm sifati past' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  note!: string;
}

export class ListUsersDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Telefon yoki ism bo‘yicha qidiruv' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class ListVehiclesDto {
  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: [UserStatus.ACTIVE, UserStatus.BLOCKED] })
  @IsIn([UserStatus.ACTIVE, UserStatus.BLOCKED])
  status!: UserStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
