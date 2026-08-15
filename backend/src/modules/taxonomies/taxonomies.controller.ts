import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { TaxonomiesService } from './taxonomies.service.js';
import { CreateTaxonomyValueDto } from './dto/create-taxonomy-value.dto.js';
import { UpdateTaxonomyValueDto } from './dto/update-taxonomy-value.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TaxonomiesController {
  constructor(private readonly taxonomiesService: TaxonomiesService) {}

  // Public — every dropdown that needs a taxonomy (register/employer,
  // post-internship form, browse filters) is reachable before or without login.
  @Public()
  @Get('taxonomies/:listKey')
  listActive(@Param('listKey') listKey: string) {
    return this.taxonomiesService.listActive(listKey);
  }

  @Roles('admin')
  @Get('admin/taxonomies/:listKey')
  listAll(@Param('listKey') listKey: string) {
    return this.taxonomiesService.listAll(listKey);
  }

  @Roles('admin')
  @Post('admin/taxonomies/:listKey')
  create(@Param('listKey') listKey: string, @Body() dto: CreateTaxonomyValueDto) {
    return this.taxonomiesService.create(listKey, dto);
  }

  @Roles('admin')
  @Patch('admin/taxonomies/:listKey/:id')
  update(
    @Param('listKey') listKey: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaxonomyValueDto,
  ) {
    return this.taxonomiesService.update(listKey, id, dto);
  }
}
