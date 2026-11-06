import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, VehicleDocumentType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListDocumentsDto {
  @ApiPropertyOptional({ enum: DocumentStatus, default: DocumentStatus.PENDING })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: VehicleDocumentType })
  @IsOptional()
  @IsEnum(VehicleDocumentType)
  type?: VehicleDocumentType;

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
