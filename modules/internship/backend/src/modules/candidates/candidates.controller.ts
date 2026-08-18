import { Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { CandidatesService } from './candidates.service.js';
import { QueryCandidatesDto } from './dto/query-candidates.dto.js';

// No prefix — mirrors ApplicationsController's style of declaring full
// paths per method, since 'internships/:id/recommended-candidates' and
// 'candidates' are two different resource namespaces sharing one service.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('employer')
@Controller()
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get('candidates')
  findAll(@Query() query: QueryCandidatesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.candidatesService.findAll(query, user);
  }

  @Get('internships/:id/recommended-candidates')
  findRecommended(
    @Param('id', ParseUUIDPipe) internshipId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.candidatesService.findRecommendedForInternship(internshipId, user, query);
  }

  @Get('candidates/:id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.candidatesService.findOne(id, user);
  }
}
