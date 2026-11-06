import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @Length(9, 20)
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Kod 6 xonali bo‘lishi kerak' })
  code!: string;

  @ApiPropertyOptional({ example: 'Rustam Karimov' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ enum: [UserRole.CARGO_OWNER, UserRole.DRIVER] })
  @IsOptional()
  @IsIn([UserRole.CARGO_OWNER, UserRole.DRIVER])
  role?: UserRole;
}
