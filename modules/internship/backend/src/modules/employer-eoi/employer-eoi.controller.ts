import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createMimeTypeFilter, VERIFICATION_DOCUMENT_MIME_TYPES } from '../../common/utils/file-filter.util.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { EmployerEoiService } from './employer-eoi.service.js';
import { CreateEmployerEoiDto } from './dto/create-employer-eoi.dto.js';
import { QueryEmployerEoiDto } from './dto/query-employer-eoi.dto.js';
import { UpdateEmployerEoiEmailDto } from './dto/update-employer-eoi-email.dto.js';
import { DecideEmployerEoiDto } from './dto/decide-employer-eoi.dto.js';

@Controller()
export class EmployerEoiController {
  constructor(private readonly employerEoiService: EmployerEoiService) {}

  // No guards at all — this is the one entry point in the whole app meant
  // to work with no account and no OTP. @Public() is kept anyway for the
  // same documentation-consistency reason employers.controller.ts's public
  // routes carry it even though no guard is attached.
  @Public()
  @Post('employer-eoi')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10) * 1024 * 1024 },
      fileFilter: createMimeTypeFilter(VERIFICATION_DOCUMENT_MIME_TYPES),
    }),
  )
  create(@Body() dto: CreateEmployerEoiDto, @UploadedFile() file: Express.Multer.File, @Ip() ip: string) {
    return this.employerEoiService.create(
      dto,
      { buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype },
      ip || null,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/employer-eoi')
  findAll(@Query() query: QueryEmployerEoiDto) {
    return this.employerEoiService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/employer-eoi/:id/email')
  updateEmail(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployerEoiEmailDto) {
    return this.employerEoiService.updateEmail(id, dto.email);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/employer-eoi/:id/decision')
  decide(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: DecideEmployerEoiDto,
  ) {
    return this.employerEoiService.decide(id, admin.sub, dto.status);
  }
}
