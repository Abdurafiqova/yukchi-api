import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateOfferDto {
  @ApiProperty({ example: 4800000, description: 'Taklif narxi (so‘m)' })
  @IsInt()
  @Min(1)
  @Max(1_000_000_000)
  price!: number;

  @ApiPropertyOptional({ example: 'Ertaga 08:00 da yuklashga tayyorman' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({ description: 'Haydovchi mashinasi (ixtiyoriy)' })
  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
