import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '+998901234567', description: 'Telefon raqami (9 raqam yetarli)' })
  @IsString()
  @Length(9, 20)
  phone!: string;
}
