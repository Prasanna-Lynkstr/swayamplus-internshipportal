import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op, cast, col, fn, literal, where as sqlWhere } from '@sequelize/core';
import {
  EMPLOYER_MODEL,
  INTERNSHIP_APPLICATION_MODEL,
  INTERNSHIP_MODEL,
} from '../../database/database.constants.js';
import { Employer, Internship, InternshipApplication } from '../../database/models/index.js';
import { INTERNSHIP_CATEGORIES } from '../../common/constants/categories.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { CreateInternshipDto } from './dto/create-internship.dto.js';
import { UpdateInternshipDto } from './dto/update-internship.dto.js';
import { QueryInternshipsDto } from './dto/query-internships.dto.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';

@Injectable()
export class InternshipsService {
  constructor(
    @Inject(INTERNSHIP_MODEL) private readonly internshipModel: typeof Internship,
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
    private readonly configService: ConfigService,
  ) {}

  private async getApprovedEmployer(userId: number): Promise<Employer> {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    if (employer.verificationStatus !== 'approved') {
      throw new ForbiddenException('Only verified employers can manage internships.');
    }
    return employer;
  }

  async create(userId: number, dto: CreateInternshipDto): Promise<Internship> {
    const employer = await this.getApprovedEmployer(userId);
    return this.internshipModel.create({
      employerId: employer.id,
      title: dto.title,
      description: dto.description,
      skillTags: dto.skillTags ?? [],
      category: dto.category,
      mode: dto.mode,
      employmentType: dto.employmentType ?? 'full-time',
      location: dto.location ?? null,
      durationWeeks: dto.durationWeeks,
      workingDays: dto.workingDays ?? 5,
      scheduleType: dto.scheduleType ?? 'flexible',
      stipendMin: dto.stipendMin ?? null,
      stipendMax: dto.stipendMax ?? null,
      responsibilities: dto.responsibilities ?? [],
      perks: dto.perks ?? [],
      eligibility: dto.eligibility ?? [],
      openings: dto.openings ?? 1,
      applicationDeadline: new Date(dto.applicationDeadline),
      status: 'draft',
    });
  }

  async findPublished(query: QueryInternshipsDto) {
    const where: Record<string | symbol, unknown> = { status: 'published' };
    if (query.location) where.location = { [Op.iLike]: `%${query.location}%` };
    if (query.category) where.category = query.category;
    if (query.mode) where.mode = query.mode;
    if (query.employmentType) where.employmentType = query.employmentType;
    if (query.q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${query.q}%` } },
        { description: { [Op.iLike]: `%${query.q}%` } },
        // skillTags is jsonb — cast to text so a search for "React" also
        // matches a listing that only mentions it in the skill tag list,
        // not the title/description.
        sqlWhere(cast(col('skillTags'), 'text'), { [Op.iLike]: `%${query.q}%` }),
      ];
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    // Postgres puts NULLs first in a DESC sort by default, which would float
    // "stipend not disclosed" rows above the actual highest-paying ones.
    const order =
      query.sort === 'stipend_high'
        ? [literal('"stipendMax" DESC NULLS LAST')]
        : query.sort === 'deadline_soon'
          ? [['applicationDeadline', 'ASC'] as [string, string]]
          : [['createdAt', 'DESC'] as [string, string]];

    const { rows, count } = await this.internshipModel.findAndCountAll({
      where,
      include: [{ model: this.employerModel, as: 'employer' }],
      order,
      limit: pageSize,
      offset,
    });

    return toPaginatedResult(rows, count, page, pageSize);
  }

  async getCategoryCounts(): Promise<Array<{ category: string; count: number }>> {
    const rows = await this.internshipModel.findAll({
      attributes: ['category', [fn('COUNT', col('id')), 'count']],
      where: { status: 'published' },
      group: ['category'],
      raw: true,
    });
    const counts = new Map(
      (rows as unknown as Array<{ category: string; count: string }>).map((r) => [
        r.category,
        Number(r.count),
      ]),
    );
    // Return the full closed taxonomy (zero-count categories included) so the
    // chip row and the post-form dropdown always reflect the complete set.
    return INTERNSHIP_CATEGORIES.map((category) => ({
      category,
      count: counts.get(category) ?? 0,
    }));
  }

  async findMine(userId: number, query: PaginationQueryDto) {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.internshipModel.findAndCountAll({
      where: { employerId: employer.id },
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    // Applicant counts per listing — lets the dashboard know which
    // internships are safe to hard-delete (zero applicants) without an
    // extra round trip per row.
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? ((await this.applicationModel.findAll({
          attributes: ['internshipId', [fn('COUNT', col('id')), 'count']],
          where: { internshipId: ids },
          group: ['internshipId'],
          raw: true,
        })) as unknown as Array<{ internshipId: number; count: string }>)
      : [];
    const countByInternshipId = new Map(counts.map((c) => [c.internshipId, Number(c.count)]));

    const items = rows.map((row) => ({
      ...row.get({ plain: true }),
      applicationsCount: countByInternshipId.get(row.id) ?? 0,
    }));

    return toPaginatedResult(items, count, page, pageSize);
  }

  /**
   * Public detail lookup — but "public" only extends to published listings.
   * A draft/closed/archived internship is only visible to its owning
   * employer or an admin; everyone else gets the same 404 a nonexistent id
   * would, so the response never confirms the id belongs to something real.
   */
  async findOne(id: number, requester: AuthenticatedUser | null) {
    const internship = await this.internshipModel.findByPk(id, {
      include: [{ model: this.employerModel, as: 'employer' }],
    });
    if (!internship) {
      throw new NotFoundException('Internship not found.');
    }

    if (internship.status !== 'published') {
      const isAdmin = requester?.role === 'admin';
      const isOwner =
        requester?.role === 'employer' && internship.employer?.userId === requester.sub;
      if (!isAdmin && !isOwner) {
        throw new NotFoundException('Internship not found.');
      }
    }

    const applicationsCount = await this.applicationModel.count({
      where: { internshipId: id },
    });
    return { ...internship.get({ plain: true }), applicationsCount };
  }

  private async findOwned(id: number, userId: number): Promise<Internship> {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    const internship = await this.internshipModel.findByPk(id);
    if (!internship || internship.employerId !== employer.id) {
      throw new NotFoundException('Internship not found.');
    }
    return internship;
  }

  async update(id: number, userId: number, dto: UpdateInternshipDto): Promise<Internship> {
    const internship = await this.findOwned(id, userId);
    const { applicationDeadline, ...rest } = dto;
    internship.set(rest);
    if (applicationDeadline) {
      internship.applicationDeadline = new Date(applicationDeadline);
    }
    await internship.save();
    return internship;
  }

  async publish(id: number, userId: number): Promise<Internship> {
    const internship = await this.findOwned(id, userId);
    internship.status = 'published';
    await internship.save();
    return internship;
  }

  async close(id: number, userId: number): Promise<Internship> {
    const internship = await this.findOwned(id, userId);
    internship.status = 'closed';
    await internship.save();
    return internship;
  }

  async remove(id: number, userId: number): Promise<void> {
    const internship = await this.findOwned(id, userId);
    const applicationsCount = await this.applicationModel.count({ where: { internshipId: id } });
    if (applicationsCount > 0) {
      throw new ConflictException(
        'This internship has applicants and cannot be deleted. Close it instead.',
      );
    }
    await internship.destroy();
  }

  async assertOwnedByUser(internshipId: number, userId: number): Promise<Internship> {
    return this.findOwned(internshipId, userId);
  }
}
