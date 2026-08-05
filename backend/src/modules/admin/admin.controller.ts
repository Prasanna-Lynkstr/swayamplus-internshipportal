import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { VerifyEmployerDto } from './dto/verify-employer.dto.js';
import { QueryAdminInternshipsDto } from './dto/query-admin-internships.dto.js';
import { QueryAdminEmployersDto } from './dto/query-admin-employers.dto.js';
import { QueryAdminStudentsDto } from './dto/query-admin-students.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  @Get('employers/pending')
  getPendingEmployers(@Query() query: QueryAdminEmployersDto) {
    return this.adminService.getPendingEmployers(query);
  }

  @Patch('employers/:id/verify')
  verifyEmployer(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyEmployerDto) {
    return this.adminService.verifyEmployer(id, dto);
  }

  @Get('internships')
  getAllInternships(@Query() query: QueryAdminInternshipsDto) {
    return this.adminService.getAllInternships(query);
  }

  @Get('students')
  getAllStudents(@Query() query: QueryAdminStudentsDto) {
    return this.adminService.getAllStudents(query);
  }
}
