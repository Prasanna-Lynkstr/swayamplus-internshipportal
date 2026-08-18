import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op, cast, col, where as sqlWhere } from '@sequelize/core';
import {
  EMPLOYER_MODEL,
  INTERNSHIP_APPLICATION_MODEL,
  INTERNSHIP_MODEL,
  STUDENT_MODEL,
  STUDENT_PREFERENCE_MODEL,
  USER_MODEL,
} from '../../database/database.constants.js';
import {
  Employer,
  Internship,
  InternshipApplication,
  Student,
  StudentPreference,
  User,
} from '../../database/models/index.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { USER_SAFE_ATTRIBUTES } from '../../common/constants/user-safe-attributes.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';
import { serializeStudent } from '../../common/utils/serialize-student.util.js';
import { matchedSkillTags, scoreStudentMatch } from '../../common/utils/match-score.util.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { QueryCandidatesDto } from './dto/query-candidates.dto.js';

const RECENT_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class CandidatesService {
  constructor(
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(STUDENT_PREFERENCE_MODEL)
    private readonly studentPreferenceModel: typeof StudentPreference,
    @Inject(INTERNSHIP_MODEL) private readonly internshipModel: typeof Internship,
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
    private readonly configService: ConfigService,
  ) {}

  // Same "admin-verified only" bar InternshipsService.getApprovedEmployer
  // applies to posting/managing listings — proactively browsing the full
  // student directory (full contact info, no application required) is at
  // least as sensitive, so a merely-registered employer gets the same
  // rejection a pending listing-creation attempt would.
  private async getApprovedEmployer(userId: number): Promise<Employer> {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    if (employer.verificationStatus !== 'approved') {
      throw new ForbiddenException('Only verified employers can browse candidates.');
    }
    return employer;
  }

  // Batched, scoped to just the ids being returned — same shape as
  // InternshipsService.getActivelyHiringEmployerIds. "Active" here means
  // "applied to any internship in the last 7 days" — the only genuine
  // activity signal available; no login/session tracking exists anywhere
  // in this schema.
  private async getRecentlyActiveStudentIds(studentIds: number[]): Promise<Set<number>> {
    if (studentIds.length === 0) return new Set();
    const since = new Date(Date.now() - RECENT_ACTIVITY_WINDOW_MS);
    const rows = await this.applicationModel.findAll({
      attributes: ['studentId'],
      where: { studentId: { [Op.in]: [...new Set(studentIds)] }, createdAt: { [Op.gte]: since } },
      group: ['studentId'],
      raw: true,
    });
    return new Set((rows as unknown as Array<{ studentId: number }>).map((r) => r.studentId));
  }

  private async getAppliedStudentIds(
    internshipId: number,
    studentIds: number[],
  ): Promise<Set<number>> {
    if (studentIds.length === 0) return new Set();
    const rows = await this.applicationModel.findAll({
      where: { internshipId, studentId: { [Op.in]: [...new Set(studentIds)] } },
      attributes: ['studentId'],
    });
    return new Set(rows.map((r) => r.studentId));
  }

  private async preferencesByStudentId(
    studentIds: number[],
  ): Promise<Map<number, StudentPreference>> {
    if (studentIds.length === 0) return new Map();
    const rows = await this.studentPreferenceModel.findAll({
      where: { studentId: { [Op.in]: studentIds } },
    });
    return new Map(rows.map((r) => [r.studentId, r]));
  }

  // Opted-out students never surface here, in either endpoint below.
  private baseWhere(query: { q?: string; location?: string }): Record<string | symbol, unknown> {
    const where: Record<string | symbol, unknown> = { discoverableToEmployers: true };
    if (query.location) where.city = { [Op.iLike]: `%${query.location}%` };
    if (query.q) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${query.q}%` } },
        { collegeName: { [Op.iLike]: `%${query.q}%` } },
        { course: { [Op.iLike]: `%${query.q}%` } },
        // skills is jsonb — cast to text so a search for "React" also
        // matches a candidate who only lists it as a skill tag.
        sqlWhere(cast(col('skills'), 'text'), { [Op.iLike]: `%${query.q}%` }),
      ];
    }
    return where;
  }

  // Filtering/sorting/paginating are all done over the full matching set in
  // memory (not pushed into SQL limit/offset) — same "fine at this
  // codebase's scale" tradeoff InternshipsService.findPublished's relevance
  // branch already makes, since preferredCategories/Modes/EmploymentTypes
  // matching isn't a clean SQL containment query against a Student that has
  // no direct association to StudentPreference.
  async findAll(query: QueryCandidatesDto, requester: AuthenticatedUser) {
    await this.getApprovedEmployer(requester.sub);
    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const rows = await this.studentModel.findAll({
      where: this.baseWhere(query),
      include: [{ model: this.userModel, as: 'user', ...USER_SAFE_ATTRIBUTES }],
    });
    const preferencesById = await this.preferencesByStudentId(rows.map((r) => r.id));

    let filtered = rows;
    if (query.category?.length || query.mode?.length || query.employmentType?.length) {
      filtered = filtered.filter((student) => {
        const prefs = preferencesById.get(student.id);
        if (!prefs) return false;
        if (
          query.category?.length &&
          !query.category.some((c) => prefs.preferredCategories.includes(c))
        ) {
          return false;
        }
        if (query.mode?.length && !query.mode.some((m) => prefs.preferredModes.includes(m))) {
          return false;
        }
        if (
          query.employmentType?.length &&
          !query.employmentType.some((t) => prefs.preferredEmploymentTypes.includes(t))
        ) {
          return false;
        }
        return true;
      });
    }

    const needsActivity = Boolean(query.activeOnly) || query.sort === 'recent_activity';
    const activeIds = needsActivity
      ? await this.getRecentlyActiveStudentIds(filtered.map((s) => s.id))
      : new Set<number>();
    if (query.activeOnly) {
      filtered = filtered.filter((s) => activeIds.has(s.id));
    }

    const sorted = [...filtered].sort((a, b) => {
      if (query.sort === 'recent_activity') {
        const activeDelta = Number(activeIds.has(b.id)) - Number(activeIds.has(a.id));
        if (activeDelta !== 0) return activeDelta;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = sorted.length;
    const pageRows = sorted.slice(offset, offset + pageSize);
    const pageActiveIds = needsActivity
      ? activeIds
      : await this.getRecentlyActiveStudentIds(pageRows.map((r) => r.id));

    const items = pageRows.map((row) =>
      serializeStudent(row.get({ plain: true }), {
        activeRecently: pageActiveIds.has(row.id),
        preferences: preferencesById.get(row.id)?.get({ plain: true }) ?? null,
      }),
    );
    return toPaginatedResult(items, total, page, pageSize);
  }

  async findOne(id: number, requester: AuthenticatedUser) {
    await this.getApprovedEmployer(requester.sub);
    const student = await this.studentModel.findOne({
      where: { id, discoverableToEmployers: true },
      include: [{ model: this.userModel, as: 'user', ...USER_SAFE_ATTRIBUTES }],
    });
    if (!student) {
      throw new NotFoundException('Candidate not found.');
    }
    const preferences = await this.studentPreferenceModel.findOne({ where: { studentId: id } });
    const activeIds = await this.getRecentlyActiveStudentIds([student.id]);
    return serializeStudent(student.get({ plain: true }), {
      activeRecently: activeIds.has(student.id),
      preferences: preferences ? preferences.get({ plain: true }) : null,
    });
  }

  // Ranked against one specific listing — excludes students who've already
  // applied to it (they already surface in the employer's Applicants panel;
  // repeating them here would be redundant).
  async findRecommendedForInternship(
    internshipUuid: string,
    requester: AuthenticatedUser,
    query: PaginationQueryDto,
  ) {
    const employer = await this.getApprovedEmployer(requester.sub);
    const internship = await this.internshipModel.findOne({ where: { uuid: internshipUuid } });
    if (!internship || internship.employerId !== employer.id) {
      throw new NotFoundException('Internship not found.');
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const rows = await this.studentModel.findAll({
      where: { discoverableToEmployers: true },
      include: [{ model: this.userModel, as: 'user', ...USER_SAFE_ATTRIBUTES }],
    });
    const preferencesById = await this.preferencesByStudentId(rows.map((r) => r.id));
    const appliedIds = await this.getAppliedStudentIds(
      internship.id,
      rows.map((r) => r.id),
    );
    const candidates = rows.filter((r) => !appliedIds.has(r.id));

    const scored = candidates
      .map((row) => ({
        row,
        score: scoreStudentMatch(row.skills, preferencesById.get(row.id) ?? null, internship),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || b.row.createdAt.getTime() - a.row.createdAt.getTime());

    const total = scored.length;
    const pageRows = scored.slice(offset, offset + pageSize);
    const activeIds = await this.getRecentlyActiveStudentIds(pageRows.map(({ row }) => row.id));

    const items = pageRows.map(({ row, score }) =>
      serializeStudent(row.get({ plain: true }), {
        score,
        activeRecently: activeIds.has(row.id),
        preferences: preferencesById.get(row.id)?.get({ plain: true }) ?? null,
        matchedSkills: matchedSkillTags(row.skills, internship.skillTags),
      }),
    );
    return toPaginatedResult(items, total, page, pageSize);
  }
}
