import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { InterestRegistrationsService } from './interest-registrations.service.js';
import { CreateInterestRegistrationDto } from './dto/create-interest-registration.dto.js';
import { QueryInterestRegistrationsDto } from './dto/query-interest-registrations.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class InterestRegistrationsController {
  constructor(private readonly interestRegistrationsService: InterestRegistrationsService) {}

  // Day-1, pre-profile capture — deliberately no auth, unlike every other
  // write endpoint in this API. Anyone can submit interest before creating
  // an account at all.
  @Public()
  @Post('interest-registrations')
  create(@Body() dto: CreateInterestRegistrationDto) {
    return this.interestRegistrationsService.create(dto);
  }

  @Roles('admin')
  @Get('admin/interest-registrations')
  findAll(@Query() query: QueryInterestRegistrationsDto) {
    return this.interestRegistrationsService.findAll(query);
  }
}
