import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'POST /auth/verify-otp dan olingan refresh token' })
  @IsString()
  @Length(32, 200)
  refreshToken!: string;
}
