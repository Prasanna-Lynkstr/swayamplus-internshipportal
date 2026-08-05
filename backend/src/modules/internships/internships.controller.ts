import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { InternshipsService } from './internships.service.js';
import { CreateInternshipDto } from './dto/create-internship.dto.js';
import { UpdateInternshipDto } from './dto/update-internship.dto.js';
import { QueryInternshipsDto } from './dto/query-internships.dto.js';

@Controller('internships')
export class InternshipsController {
  constructor(private readonly internshipsService: InternshipsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInternshipDto) {
    return this.internshipsService.create(user.sub, dto);
  }

  @Public()
  @Get()
  findPublished(@Query() query: QueryInternshipsDto) {
    return this.internshipsService.findPublished(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employer')
  @Get('mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.internshipsService.findMine(user.sub);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.internshipsService.findOne(id);
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
}
