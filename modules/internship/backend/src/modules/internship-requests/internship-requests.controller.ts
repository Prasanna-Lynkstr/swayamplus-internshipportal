import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { sendCsv } from '../../common/utils/send-csv.util.js';
import { InternshipRequestsService } from './internship-requests.service.js';
import { CreateInternshipRequestDto } from './dto/create-internship-request.dto.js';
import { QueryInternshipRequestsDto } from './dto/query-internship-requests.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class InternshipRequestsController {
  constructor(private readonly internshipRequestsService: InternshipRequestsService) {}

  @Roles('student')
  @Post('internship-requests')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInternshipRequestDto) {
    return this.internshipRequestsService.create(user.sub, dto);
  }

  @Roles('admin')
  @Get('admin/internship-requests')
  findAll(@Query() query: QueryInternshipRequestsDto) {
    return this.internshipRequestsService.findAll(query);
  }

  // Same filters as findAll, unpaged — CSV for a marketing manager to
  // upload into Mailchimp. These are the highest-intent leads on the
  // platform: students who explicitly said they couldn't find what they
  // were looking for.
  @Roles('admin')
  @Get('admin/internship-requests/export')
  async exportAll(@Query() query: QueryInternshipRequestsDto, @Res({ passthrough: true }) res: Response) {
    const csv = await this.internshipRequestsService.exportAll(query);
    sendCsv(res, csv, 'internship-requests.csv');
  }
}
