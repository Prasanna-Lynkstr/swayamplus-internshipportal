import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createMimeTypeFilter, RESUME_MIME_TYPES } from '../../common/utils/file-filter.util.js';
import { getMissingStudentProfileFields } from '../../common/utils/student-profile.util.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { StudentsService } from './students.service.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const student = await this.studentsService.getByUserId(user.sub);
    const missingFields = getMissingStudentProfileFields(student);
    return {
      ...student.get({ plain: true }),
      profileComplete: missingFields.length === 0,
      missingFields,
    };
  }

  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateStudentDto) {
    return this.studentsService.updateByUserId(user.sub, dto);
  }

  @Get('me/dashboard')
  getMyDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.studentsService.getDashboardStats(user.sub);
  }

  @Post('me/resume')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10) * 1024 * 1024 },
      fileFilter: createMimeTypeFilter(RESUME_MIME_TYPES),
    }),
  )
  uploadResume(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File) {
    return this.studentsService.saveResume(user.sub, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
  }
}
