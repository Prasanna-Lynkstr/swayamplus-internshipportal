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
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.employersService.getByUserId(user.sub);
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
      limits: { fileSize: 10 * 1024 * 1024 },
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
