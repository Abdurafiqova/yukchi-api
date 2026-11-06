import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { documentUploadOptions, type UploadedDocumentFile } from './document-upload';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@ApiTags('vehicle-documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles/:vehicleId/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Mashina hujjatlari (talab qilinganlar bilan)' })
  list(@Param('vehicleId') vehicleId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.listForVehicle(vehicleId, user);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Hujjat yuklash (JPG, PNG, WEBP yoki PDF, 8 MB gacha)' })
  upload(
    @Param('vehicleId') vehicleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file?: UploadedDocumentFile,
  ) {
    return this.documents.upload(vehicleId, user, dto.type, file);
  }

  @Delete(':documentId')
  @ApiOperation({ summary: 'Hujjatni o‘chirish' })
  remove(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.remove(vehicleId, documentId, user);
  }

  @Get(':documentId/file')
  @ApiOperation({ summary: 'Hujjat faylini ko‘rish (faqat egasi yoki admin)' })
  async file(
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const doc = await this.documents.getFile(vehicleId, documentId, user);

    res.setHeader('Content-Type', doc.fileMime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=60');

    createReadStream(doc.path).pipe(res);
  }
}
