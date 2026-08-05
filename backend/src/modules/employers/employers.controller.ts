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
import {
  createMimeTypeFilter,
  VERIFICATION_DOCUMENT_MIME_TYPES,
} from '../../common/utils/file-filter.util.js';
import { getMissingEmployerProfileFields } from '../../common/utils/employer-profile.util.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { EmployersService } from './employers.service.js';
import { RegisterEmployerDto } from './dto/register-employer.dto.js';
import { UpdateEmployerDto } from './dto/update-employer.dto.js';

@Controller('employers')
export class EmployersController {
  constructor(private readonly employersService: EmployersService) {}

  @Public()
  @Get('registration-status')
  getRegistrationStatus() {
    return this.employersService.getRegistrationStatus();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Post('register')
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterEmployerDto) {
    return this.employersService.register(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const employer = await this.employersService.getByUserId(user.sub);
    const missingFields = getMissingEmployerProfileFields(employer);
    return {
      ...employer.get({ plain: true }),
      profileComplete: missingFields.length === 0,
      missingFields,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Get('me/dashboard')
  getMyDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.employersService.getDashboardStats(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateEmployerDto) {
    return this.employersService.updateByUserId(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Post('me/verification-document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      // Bun loads .env before any module code runs, so this env read at
      // decoration time (not through ConfigService, which isn't available
      // yet here) already reflects the configured value.
      limits: { fileSize: Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10) * 1024 * 1024 },
      fileFilter: createMimeTypeFilter(VERIFICATION_DOCUMENT_MIME_TYPES),
    }),
  )
  async uploadVerificationDocument(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.employersService.saveVerificationDocument(user.sub, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
    });
  }
}
