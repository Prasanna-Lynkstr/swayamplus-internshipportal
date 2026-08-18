import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SAVED_SEARCH_MODEL, STUDENT_MODEL } from '../../database/database.constants.js';
import { SavedSearch, Student } from '../../database/models/index.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto.js';

// Mirrors lib/internshipFilters.ts's FILTER_KEYS on the frontend exactly —
// the one place on the backend that needs to know the browse page's filter
// vocabulary, since a saved search is never allowed to persist a key/value
// the client didn't actually send through that UI.
const ALLOWED_FILTER_KEYS = [
  'q',
  'location',
  'category',
  'mode',
  'employmentType',
  'educationLevel',
  'stream',
  'experienceRequired',
  'paid',
  'sort',
  'stipendMin',
] as const;

@Injectable()
export class SavedSearchesService {
  constructor(
    @Inject(SAVED_SEARCH_MODEL) private readonly savedSearchModel: typeof SavedSearch,
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    private readonly configService: ConfigService,
  ) {}

  private async resolveStudentId(userId: number): Promise<number> {
    const student = await this.studentModel.findOne({ where: { userId }, attributes: ['id'] });
    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }
    return student.id;
  }

  async create(userId: number, dto: CreateSavedSearchDto): Promise<SavedSearch> {
    const studentId = await this.resolveStudentId(userId);

    const filters: Record<string, string> = {};
    for (const key of ALLOWED_FILTER_KEYS) {
      const value = dto.filters?.[key];
      if (value !== undefined && value !== null && String(value).length > 0) {
        filters[key] = String(value);
      }
    }
    if (Object.keys(filters).length === 0) {
      throw new BadRequestException('At least one filter is required to save a search.');
    }

    return this.savedSearchModel.create({ studentId, filters });
  }

  async findMine(userId: number, query: PaginationQueryDto) {
    const studentId = await this.resolveStudentId(userId);
    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.savedSearchModel.findAndCountAll({
      where: { studentId },
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return toPaginatedResult(rows, count, page, pageSize);
  }

  async remove(userId: number, id: number): Promise<void> {
    const studentId = await this.resolveStudentId(userId);
    const savedSearch = await this.savedSearchModel.findOne({ where: { id, studentId } });
    if (!savedSearch) {
      throw new NotFoundException('Saved search not found.');
    }
    await savedSearch.destroy();
  }
}
