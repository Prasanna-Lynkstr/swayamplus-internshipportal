import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { InternshipRequestsService } from './internship-requests.service.js';
import { CreateInternshipRequestDto } from './dto/create-internship-request.dto.js';

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
  findAll() {
    return this.internshipRequestsService.findAll();
  }
}
