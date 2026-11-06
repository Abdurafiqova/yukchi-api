import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Salom, yukni ertaga ertalab olib ketaman.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}
