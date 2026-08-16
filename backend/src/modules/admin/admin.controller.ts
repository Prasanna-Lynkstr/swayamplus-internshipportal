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
import { ModerateInternshipDto } from './dto/moderate-internship.dto.js';
import { UpdateEmployerModerationDto } from './dto/update-employer-moderation.dto.js';
import { TakeDownInternshipsDto } from './dto/take-down-internships.dto.js';
import { QueryDashboardTimelineDto } from './dto/query-dashboard-timeline.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/timeline')
  getDashboardTimeline(@Query() query: QueryDashboardTimelineDto) {
    return this.adminService.getDashboardTimeline(query);
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  // Kept at the old 'pending' path for URL stability even though the
  // `status` query param now makes this list any/all employers, not just
  // pending ones — the default frontend call still passes status=pending.
  @Get('employers/pending')
  getEmployers(@Query() query: QueryAdminEmployersDto) {
    return this.adminService.getEmployers(query);
  }

  @Patch('employers/:id/verify')
  verifyEmployer(@Param('id', ParseIntPipe) id: number, @Body() dto: VerifyEmployerDto) {
    return this.adminService.verifyEmployer(id, dto);
  }

  @Patch('employers/:id/moderation')
  setEmployerModerationMode(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployerModerationDto,
  ) {
    return this.adminService.setEmployerModerationMode(id, dto);
  }

  @Get('internships')
  getAllInternships(@Query() query: QueryAdminInternshipsDto) {
    return this.adminService.getAllInternships(query);
  }

  @Patch('internships/:id/moderate')
  moderateInternship(@Param('id', ParseIntPipe) id: number, @Body() dto: ModerateInternshipDto) {
    return this.adminService.moderateInternship(id, dto);
  }

  @Patch('internships/takedown')
  takeDownInternships(@Body() dto: TakeDownInternshipsDto) {
    return this.adminService.takeDownInternships(dto.ids);
  }

  @Get('students')
  getAllStudents(@Query() query: QueryAdminStudentsDto) {
    return this.adminService.getAllStudents(query);
  }
}
