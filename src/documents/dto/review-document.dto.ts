import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewDocumentDto {
  @ApiProperty({ enum: [DocumentStatus.APPROVED, DocumentStatus.REJECTED] })
  @IsIn([DocumentStatus.APPROVED, DocumentStatus.REJECTED])
  status!: DocumentStatus;

  @ApiPropertyOptional({ example: 'Rasm sifati past, qayta yuklang' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
