import { Body, Controller, Get, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { VerifyEmployerDto } from './dto/verify-employer.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Get('employers/pending')
  getPendingEmployers() {
    return this.adminService.getPendingEmployers();
  }

  @Patch('employers/:id/verify')
  verifyEmployer(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyEmployerDto) {
    return this.adminService.verifyEmployer(id, dto);
  }
}
