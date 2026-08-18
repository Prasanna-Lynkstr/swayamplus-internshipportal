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
  STUDENT_MODEL,
  STUDENT_PREFERENCE_MODEL,
} from '../../database/database.constants.js';
import {
  Employer,
  Internship,
  InternshipApplication,
  Student,
  StudentPreference,
} from '../../database/models/index.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { CHECKLIST_GENERATOR_SERVICE } from '../checklist/checklist.constants.js';
import type { ChecklistGeneratorService } from '../checklist/checklist.types.js';
import { TaxonomiesService } from '../taxonomies/taxonomies.service.js';
import { CreateInternshipDto } from './dto/create-internship.dto.js';
import { UpdateInternshipDto } from './dto/update-internship.dto.js';
import { QueryInternshipsDto } from './dto/query-internships.dto.js';
import { QueryMineInternshipsDto } from './dto/query-mine-internships.dto.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';
import { serializeInternship } from '../../common/utils/serialize-internship.util.js';
import { matchedSkillTags, scoreStudentMatch } from '../../common/utils/match-score.util.js';

@Injectable()
export class InternshipsService {
  constructor(
    @Inject(INTERNSHIP_MODEL) private readonly internshipModel: typeof Internship,
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(STUDENT_PREFERENCE_MODEL) private readonly studentPreferenceModel: typeof StudentPreference,
    @Inject(CHECKLIST_GENERATOR_SERVICE)
    private readonly checklistGeneratorService: ChecklistGeneratorService,
    private readonly configService: ConfigService,
    private readonly taxonomiesService: TaxonomiesService,
  ) {}

  private async assertTaxonomiesValid(fields: {
    category?: string;
    mode?: string;
    employmentType?: string;
    scheduleType?: string;
  }): Promise<void> {
    await Promise.all([
      this.taxonomiesService.assertValid('internship_category', fields.category),
      this.taxonomiesService.assertValid('work_mode', fields.mode),
      this.taxonomiesService.assertValid('employment_type', fields.employmentType),
      this.taxonomiesService.assertValid('schedule_type', fields.scheduleType),
    ]);
  }

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

  async create(userId: number, dto: CreateInternshipDto): Promise<Record<string, unknown>> {
    const employer = await this.getApprovedEmployer(userId);
    await this.assertTaxonomiesValid({
      category: dto.category,
      mode: dto.mode,
      employmentType: dto.employmentType,
      scheduleType: dto.scheduleType,
    });
    const internship = await this.internshipModel.create({
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
      educationLevel: dto.educationLevel,
      stream: dto.stream,
      experienceRequired: dto.experienceRequired,
      checklistItems: dto.checklistItems ?? [],
      openings: dto.openings ?? 1,
      applicationDeadline: new Date(dto.applicationDeadline),
      status: 'draft',
    });
    return serializeInternship(internship.get({ plain: true }));
  }

  // Stateless by design — an employer can generate a checklist while still
  // drafting the posting, before an Internship row exists at all. The
  // (possibly edited) result is saved via the normal create/update DTO.
  async generateChecklist(userId: number, description: string): Promise<string[]> {
    await this.getApprovedEmployer(userId);
    return this.checklistGeneratorService.generate(description);
  }

  // "Any preference actually set" — an empty-but-existing StudentPreference
  // row (created alongside every Student, see StudentsService.getPreferences)
  // shouldn't itself trigger a relevance default; only a student who's
  // actually filled something in should get reordered results.
  private hasAnyPreferenceSet(preferences: StudentPreference | null): boolean {
    if (!preferences) return false;
    return (
      preferences.preferredCategories.length > 0 ||
      preferences.preferredModes.length > 0 ||
      preferences.preferredEmploymentTypes.length > 0 ||
      preferences.preferredLocations.length > 0 ||
      preferences.paidPreference !== 'either'
    );
  }

  // One batched query against just the current page's ids — not an N+1
  // lookup per card. Empty set (not a query at all) when there's no
  // authenticated student, so anonymous/employer/admin browsing pays
  // nothing extra.
  private async getAppliedInternshipIds(
    studentId: number | null,
    internshipIds: number[],
  ): Promise<Set<number>> {
    if (!studentId || internshipIds.length === 0) return new Set();
    const rows = await this.applicationModel.findAll({
      where: { studentId, internshipId: { [Op.in]: internshipIds } },
      attributes: ['internshipId'],
    });
    return new Set(rows.map((r) => r.internshipId));
  }

  // "Actively hiring" means exactly what it says — this employer currently
  // has more than one open role, not a guess based on application volume
  // (which reflects candidate interest, not employer activity). Scoped to
  // just the employers on this page, not a platform-wide query.
  private async getActivelyHiringEmployerIds(employerIds: number[]): Promise<Set<number>> {
    if (employerIds.length === 0) return new Set();
    const rows = (await this.internshipModel.findAll({
      attributes: ['employerId', [fn('COUNT', col('id')), 'count']],
      where: { employerId: { [Op.in]: [...new Set(employerIds)] }, status: 'published' },
      group: ['employerId'],
      raw: true,
    })) as unknown as Array<{ employerId: number; count: string }>;
    return new Set(rows.filter((r) => Number(r.count) >= 2).map((r) => r.employerId));
  }

  async findPublished(query: QueryInternshipsDto, requester: AuthenticatedUser | null) {
    const where: Record<string | symbol, unknown> = { status: 'published' };
    if (query.location) where.location = { [Op.iLike]: `%${query.location}%` };
    // Each of these is a student-facing multi-select (see FilterSidebar.tsx)
    // — Op.in with a one-element array degrades to a plain equality match,
    // so there's no separate single-vs-multi branch needed here.
    if (query.category?.length) where.category = { [Op.in]: query.category };
    if (query.mode?.length) where.mode = { [Op.in]: query.mode };
    if (query.employmentType?.length) where.employmentType = { [Op.in]: query.employmentType };
    if (query.employerId) where.employerId = query.employerId;
    // A posting tagged 'Any' means the employer doesn't care about this
    // axis, so it must show up regardless of which real level/stream a
    // student filters by — not just when a student explicitly picks "Any"
    // (which isn't even an option in the filter UI). Each condition goes
    // into its own Op.and entry (not the shared Op.or below, which is for
    // the free-text search) so both stay independently ANDed with the rest.
    const andConditions: Record<symbol, unknown>[] = [];
    if (query.educationLevel?.length) {
      andConditions.push({
        [Op.or]: [{ educationLevel: { [Op.in]: query.educationLevel } }, { educationLevel: 'Any' }],
      });
    }
    if (query.stream?.length) {
      andConditions.push({ [Op.or]: [{ stream: { [Op.in]: query.stream } }, { stream: 'Any' }] });
    }
    if (query.paid) {
      andConditions.push({
        [Op.or]: [{ stipendMin: { [Op.gt]: 0 } }, { stipendMax: { [Op.gt]: 0 } }],
      });
    }
    // "At least ₹X/month" — either bound clearing the threshold counts as a
    // match, same reasoning as the paid filter right above (an internship
    // with only one of the two set shouldn't be excluded on a technicality).
    if (query.stipendMin) {
      andConditions.push({
        [Op.or]: [
          { stipendMax: { [Op.gte]: query.stipendMin } },
          { stipendMin: { [Op.gte]: query.stipendMin } },
        ],
      });
    }
    if (andConditions.length > 0) where[Op.and] = andConditions;
    if (query.experienceRequired !== undefined) where.experienceRequired = query.experienceRequired;
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

    let studentSkills: string[] = [];
    let studentId: number | null = null;
    let studentPreferences: StudentPreference | null = null;
    if (requester?.role === 'student') {
      const student = await this.studentModel.findOne({
        where: { userId: requester.sub },
        attributes: ['id', 'skills'],
      });
      studentId = student?.id ?? null;
      studentSkills = student?.skills ?? [];
      if (studentId) {
        studentPreferences = await this.studentPreferenceModel.findOne({ where: { studentId } });
      }
    }

    // Explicit sort always wins. Omitted, it defaults to relevance for a
    // student who has skills set *or* has actually filled in Preferences
    // (nothing to rank against otherwise), and to newest for everyone else
    // — unchanged behavior for anonymous visitors, employers, and admins.
    const effectiveSort =
      query.sort ??
      (studentSkills.length > 0 || this.hasAnyPreferenceSet(studentPreferences) ? 'relevance' : 'newest');

    if (effectiveSort === 'relevance') {
      const rows = await this.internshipModel.findAll({
        where,
        include: [{ model: this.employerModel, as: 'employer' }],
      });
      const scored = rows
        .map((row) => ({ row, score: scoreStudentMatch(studentSkills, studentPreferences, row) }))
        .sort((a, b) => b.score - a.score || b.row.createdAt.getTime() - a.row.createdAt.getTime());
      const pageRows = scored.slice(offset, offset + pageSize).map(({ row }) => row);
      const [appliedIds, activelyHiringIds] = await Promise.all([
        this.getAppliedInternshipIds(
          studentId,
          pageRows.map((r) => r.id),
        ),
        this.getActivelyHiringEmployerIds(pageRows.map((r) => r.employerId)),
      ]);
      const items = pageRows.map((row) =>
        serializeInternship(row.get({ plain: true }), {
          appliedByCurrentUser: appliedIds.has(row.id),
          activelyHiring: activelyHiringIds.has(row.employerId),
          matchedSkills: matchedSkillTags(studentSkills, row.skillTags),
        }),
      );
      return toPaginatedResult(items, scored.length, page, pageSize);
    }

    // Postgres puts NULLs first in a DESC sort by default, which would float
    // "stipend not disclosed" rows above the actual highest-paying ones.
    const order =
      effectiveSort === 'stipend_high'
        ? [literal('"stipendMax" DESC NULLS LAST')]
        : effectiveSort === 'deadline_soon'
          ? [['applicationDeadline', 'ASC'] as [string, string]]
          : [['createdAt', 'DESC'] as [string, string]];

    const { rows, count } = await this.internshipModel.findAndCountAll({
      where,
      include: [{ model: this.employerModel, as: 'employer' }],
      order,
      limit: pageSize,
      offset,
    });

    const [appliedIds, activelyHiringIds] = await Promise.all([
      this.getAppliedInternshipIds(
        studentId,
        rows.map((r) => r.id),
      ),
      this.getActivelyHiringEmployerIds(rows.map((r) => r.employerId)),
    ]);
    const items = rows.map((row) =>
      serializeInternship(row.get({ plain: true }), {
        appliedByCurrentUser: appliedIds.has(row.id),
        activelyHiring: activelyHiringIds.has(row.employerId),
        matchedSkills: matchedSkillTags(studentSkills, row.skillTags),
      }),
    );

    return toPaginatedResult(items, count, page, pageSize);
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
    // Return the full active taxonomy (zero-count categories included) so
    // the chip row and the post-form dropdown always reflect the complete,
    // admin-managed set.
    const activeCategories = await this.taxonomiesService.listActive('internship_category');
    return activeCategories.map(({ value: category }) => ({
      category,
      count: counts.get(category) ?? 0,
    }));
  }

  async findMine(userId: number, query: QueryMineInternshipsDto) {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const where: Record<string | symbol, unknown> = { employerId: employer.id };
    if (query.status) where.status = query.status;
    if (query.q) where.title = { [Op.iLike]: `%${query.q}%` };

    const { rows, count } = await this.internshipModel.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    // Applicant counts (total + not-yet-actioned) per listing, grouped in a
    // single query rather than one round trip per row — lets the dashboard
    // show which internships are safe to hard-delete (zero applicants) and
    // which have applicants still waiting on a decision, even at 50+
    // listings x 200+ applicants each.
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? ((await this.applicationModel.findAll({
          attributes: ['internshipId', 'status', [fn('COUNT', col('id')), 'count']],
          where: { internshipId: ids },
          group: ['internshipId', 'status'],
          raw: true,
        })) as unknown as Array<{ internshipId: number; status: string; count: string }>)
      : [];
    const totalByInternshipId = new Map<number, number>();
    const pendingByInternshipId = new Map<number, number>();
    const shortlistedByInternshipId = new Map<number, number>();
    const offeredByInternshipId = new Map<number, number>();
    for (const row of counts) {
      const n = Number(row.count);
      totalByInternshipId.set(row.internshipId, (totalByInternshipId.get(row.internshipId) ?? 0) + n);
      if (row.status === 'applied') {
        pendingByInternshipId.set(row.internshipId, (pendingByInternshipId.get(row.internshipId) ?? 0) + n);
      } else if (row.status === 'shortlisted') {
        shortlistedByInternshipId.set(row.internshipId, (shortlistedByInternshipId.get(row.internshipId) ?? 0) + n);
      } else if (row.status === 'offered') {
        offeredByInternshipId.set(row.internshipId, (offeredByInternshipId.get(row.internshipId) ?? 0) + n);
      }
    }

    const items = rows.map((row) =>
      serializeInternship(row.get({ plain: true }), {
        applicationsCount: totalByInternshipId.get(row.id) ?? 0,
        pendingReviewCount: pendingByInternshipId.get(row.id) ?? 0,
        shortlistedCount: shortlistedByInternshipId.get(row.id) ?? 0,
        offeredCount: offeredByInternshipId.get(row.id) ?? 0,
      }),
    );

    return toPaginatedResult(items, count, page, pageSize);
  }

  /**
   * Public detail lookup — but "public" only extends to published listings.
   * A draft/closed/archived internship is only visible to its owning
   * employer or an admin; everyone else gets the same 404 a nonexistent id
   * would, so the response never confirms the id belongs to something real.
   */
  async findOne(uuid: string, requester: AuthenticatedUser | null) {
    const internship = await this.internshipModel.findOne({
      where: { uuid },
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
      where: { internshipId: internship.id },
    });
    return serializeInternship(internship.get({ plain: true }), { applicationsCount });
  }

  private async findOwned(uuid: string, userId: number): Promise<Internship> {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    const internship = await this.internshipModel.findOne({ where: { uuid } });
    if (!internship || internship.employerId !== employer.id) {
      throw new NotFoundException('Internship not found.');
    }
    return internship;
  }

  async update(
    uuid: string,
    userId: number,
    dto: UpdateInternshipDto,
  ): Promise<Record<string, unknown>> {
    const internship = await this.findOwned(uuid, userId);
    await this.assertTaxonomiesValid({
      category: dto.category,
      mode: dto.mode,
      employmentType: dto.employmentType,
      scheduleType: dto.scheduleType,
    });
    const { applicationDeadline, ...rest } = dto;
    internship.set(rest);
    if (applicationDeadline) {
      internship.applicationDeadline = new Date(applicationDeadline);
    }
    await internship.save();
    return serializeInternship(internship.get({ plain: true }));
  }

  async publish(uuid: string, userId: number): Promise<Record<string, unknown>> {
    const internship = await this.findOwned(uuid, userId);
    const employer = await this.employerModel.findByPk(internship.employerId);
    // A 'review'-mode employer's postings go to pending_review instead of
    // straight to published — an admin decision (moderateInternship) is what
    // actually publishes them from there.
    internship.status = employer?.moderationMode === 'review' ? 'pending_review' : 'published';
    await internship.save();
    return serializeInternship(internship.get({ plain: true }));
  }

  async close(uuid: string, userId: number): Promise<Record<string, unknown>> {
    const internship = await this.findOwned(uuid, userId);
    internship.status = 'closed';
    await internship.save();
    return serializeInternship(internship.get({ plain: true }));
  }

  // Lets an employer pull a posting back out of the admin's review queue —
  // e.g. to fix something before it's decided on — without waiting for an
  // explicit admin reject. Only valid from pending_review; anything else is
  // a no-op state transition that shouldn't happen from the UI, so it's
  // treated as a real error rather than silently ignored.
  async withdrawFromReview(uuid: string, userId: number): Promise<Record<string, unknown>> {
    const internship = await this.findOwned(uuid, userId);
    if (internship.status !== 'pending_review') {
      throw new ConflictException('This internship is not awaiting review.');
    }
    internship.status = 'draft';
    await internship.save();
    return serializeInternship(internship.get({ plain: true }));
  }

  async remove(uuid: string, userId: number): Promise<void> {
    const internship = await this.findOwned(uuid, userId);
    const applicationsCount = await this.applicationModel.count({
      where: { internshipId: internship.id },
    });
    if (applicationsCount > 0) {
      throw new ConflictException(
        'This internship has applicants and cannot be deleted. Close it instead.',
      );
    }
    await internship.destroy();
  }
}
