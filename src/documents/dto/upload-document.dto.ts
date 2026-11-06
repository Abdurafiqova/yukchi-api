import { ApiProperty } from '@nestjs/swagger';
import { VehicleDocumentType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UploadDocumentDto {
  @ApiProperty({ enum: VehicleDocumentType })
  @IsEnum(VehicleDocumentType)
  type!: VehicleDocumentType;
}
