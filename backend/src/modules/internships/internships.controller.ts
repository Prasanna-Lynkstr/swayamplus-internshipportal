import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { InternshipsService } from './internships.service.js';
import { CreateInternshipDto } from './dto/create-internship.dto.js';
import { UpdateInternshipDto } from './dto/update-internship.dto.js';
import { QueryInternshipsDto } from './dto/query-internships.dto.js';
import { QueryMineInternshipsDto } from './dto/query-mine-internships.dto.js';
import { GenerateChecklistDto } from './dto/generate-checklist.dto.js';

@Controller('internships')
export class InternshipsController {
  constructor(private readonly internshipsService: InternshipsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInternshipDto) {
    return this.internshipsService.create(user.sub, dto);
  }

  // Publicly reachable but auth-aware — a student's skills (if any) drive
  // the default relevance ranking, see InternshipsService.findPublished.
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findPublished(@Query() query: QueryInternshipsDto, @CurrentUser() user: AuthenticatedUser | null) {
    return this.internshipsService.findPublished(query, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryMineInternshipsDto) {
    return this.internshipsService.findMine(user.sub, query);
  }

  @Public()
  @Get('categories')
  getCategoryCounts() {
    return this.internshipsService.getCategoryCounts();
  }

  // Declared before ':id' routes below so 'checklist' is never captured as
  // an :id param — stateless, works from a draft posting before any
  // Internship row exists (see InternshipsService.generateChecklist).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Post('checklist/generate')
  async generateChecklist(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateChecklistDto,
  ) {
    const items = await this.internshipsService.generateChecklist(user.sub, dto.description);
    return { items };
  }

  // Not @Public(): this route is publicly reachable but auth-aware — a
  // draft/closed/archived internship should only resolve for its owning
  // employer or an admin (see InternshipsService.findOne for the gate).
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser | null,
  ) {
    return this.internshipsService.findOne(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateInternshipDto,
  ) {
    return this.internshipsService.update(id, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Patch(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.internshipsService.publish(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Patch(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.internshipsService.close(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Patch(':id/withdraw-review')
  withdrawFromReview(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.internshipsService.withdrawFromReview(id, user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.internshipsService.remove(id, user.sub);
  }
}
