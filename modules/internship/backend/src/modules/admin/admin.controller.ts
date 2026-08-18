import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { sendCsv } from '../../common/utils/send-csv.util.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
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

  @Get('dashboard/growth')
  getGrowthInsights() {
    return this.adminService.getGrowthInsights();
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }

  // Directory of every employer (optionally filtered by verificationStatus)
  // — every account now arrives already-approved via EmployerEoi, so this
  // is a listing endpoint, not a review queue.
  @Get('employers')
  getEmployers(@Query() query: QueryAdminEmployersDto) {
    return this.adminService.getEmployers(query);
  }

  // Same filters as getEmployers, unpaged — CSV for a marketing manager to
  // upload into Mailchimp (or any other list-based email tool).
  @Get('employers/export')
  async exportEmployers(@Query() query: QueryAdminEmployersDto, @Res({ passthrough: true }) res: Response) {
    const csv = await this.adminService.exportEmployers(query);
    sendCsv(res, csv, 'employers.csv');
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
  moderateInternship(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ModerateInternshipDto) {
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

  // Same filters as getAllStudents, unpaged — CSV for a marketing manager to
  // upload into Mailchimp (or any other list-based email tool).
  @Get('students/export')
  async exportStudents(@Query() query: QueryAdminStudentsDto, @Res({ passthrough: true }) res: Response) {
    const csv = await this.adminService.exportStudents(query);
    sendCsv(res, csv, 'students.csv');
  }
}
