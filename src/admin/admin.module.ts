import { Module } from '@nestjs/common';
import { CargosModule } from '../cargos/cargos.module';
import { DocumentsModule } from '../documents/documents.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [CargosModule, DocumentsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
