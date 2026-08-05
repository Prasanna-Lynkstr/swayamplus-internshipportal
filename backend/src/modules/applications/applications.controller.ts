import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { ApplicationsService } from './applications.service.js';
import { ApplyDto } from './dto/apply.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Roles('student')
  @Post('internships/:id/apply')
  apply(
    @Param('id', ParseIntPipe) internshipId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApplyDto,
  ) {
    return this.applicationsService.apply(user.sub, internshipId, dto);
  }

  @Roles('student')
  @Get('applications/me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.findMine(user.sub);
  }

  @Roles('student')
  @Patch('applications/:id/withdraw')
  withdraw(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.withdraw(id, user.sub);
  }

  @Roles('employer')
  @Get('internships/:id/applications')
  findForInternship(
    @Param('id', ParseIntPipe) internshipId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.applicationsService.findForInternship(internshipId, user.sub);
  }

  @Roles('employer')
  @Patch('applications/:id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, user.sub, dto);
  }
}
