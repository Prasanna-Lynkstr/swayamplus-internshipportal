import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { SavedSearchesService } from './saved-searches.service.js';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private readonly savedSearchesService: SavedSearchesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSavedSearchDto) {
    return this.savedSearchesService.create(user.sub, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.savedSearchesService.findMine(user.sub, query);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.savedSearchesService.remove(user.sub, id);
  }
}
