import { Module } from '@nestjs/common';
import { CargosController } from './cargos.controller';
import { CargosService } from './cargos.service';

@Module({
  controllers: [CargosController],
  providers: [CargosService],
  exports: [CargosService],
})
export class CargosModule {}
