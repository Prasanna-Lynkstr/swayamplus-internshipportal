import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op, cast, col, fn, where as sqlWhere } from '@sequelize/core';
import {
  EMPLOYER_EOI_MODEL,
  EMPLOYER_MODEL,
  INTERNSHIP_APPLICATION_MODEL,
  INTERNSHIP_MODEL,
  INTERNSHIP_REQUEST_MODEL,
  STUDENT_MODEL,
  STUDENT_PREFERENCE_MODEL,
  USER_MODEL,
} from '../../database/database.constants.js';
import {
  Employer,
  EmployerEoi,
  Internship,
  InternshipApplication,
  InternshipRequest,
  Student,
  StudentPreference,
  User,
} from '../../database/models/index.js';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';
import { serializeInternship } from '../../common/utils/serialize-internship.util.js';
import { USER_SAFE_ATTRIBUTES } from '../../common/constants/user-safe-attributes.js';
import { toCsv } from '../../common/utils/csv.util.js';
import { isStudentProfileComplete } from '../../common/utils/student-profile.util.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { QueryAdminInternshipsDto } from './dto/query-admin-internships.dto.js';
import { QueryAdminEmployersDto } from './dto/query-admin-employers.dto.js';
import { QueryAdminStudentsDto } from './dto/query-admin-students.dto.js';
import { ModerateInternshipDto } from './dto/moderate-internship.dto.js';
import { UpdateEmployerModerationDto } from './dto/update-employer-moderation.dto.js';
import { QueryDashboardTimelineDto } from './dto/query-dashboard-timeline.dto.js';

const DEFAULT_ACTIVITY_WINDOW_DAYS = 30;
const STUDENT_EXPORT_COLUMNS = [
  { key: 'email', label: 'Email' },
  { key: 'fullName', label: 'Full name' },
  { key: 'phone', label: 'Phone' },
  { key: 'collegeName', label: 'College' },
  { key: 'course', label: 'Course' },
  { key: 'graduationYear', label: 'Graduation year' },
  { key: 'city', label: 'City' },
  { key: 'skills', label: 'Skills' },
  { key: 'preferredCategories', label: 'Preferred categories' },
  { key: 'profileComplete', label: 'Profile complete' },
  { key: 'activity', label: 'Activity' },
  { key: 'createdAt', label: 'Registered on' },
];
const EMPLOYER_EXPORT_COLUMNS = [
  { key: 'email', label: 'Email' },
  { key: 'organizationName', label: 'Organization' },
  { key: 'contactPersonName', label: 'Contact person' },
  { key: 'contactPersonPhone', label: 'Contact phone' },
  { key: 'hqCity', label: 'HQ city' },
  { key: 'industryTags', label: 'Industry tags' },
  { key: 'verificationStatus', label: 'Verification status' },
  { key: 'postedCount', label: 'Internships posted' },
  { key: 'activation', label: 'Activation status' },
  { key: 'createdAt', label: 'Registered on' },
];

type TimelineGranularity = 'day' | 'week' | 'month';

// Matches Postgres date_trunc('week', ...): ISO week, starting Monday.
function truncateToBucketStart(date: Date, granularity: TimelineGranularity): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (granularity === 'month') return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  if (granularity === 'week') {
    const isoDayOfWeek = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - (isoDayOfWeek - 1));
  }
  return d;
}

function stepBucket(date: Date, granularity: TimelineGranularity): Date {
  const d = new Date(date);
  if (granularity === 'day') d.setUTCDate(d.getUTCDate() + 1);
  else if (granularity === 'week') d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

function generateBuckets(from: Date, to: Date, granularity: TimelineGranularity): Date[] {
  const buckets: Date[] = [];
  const end = truncateToBucketStart(to, granularity);
  for (let cursor = truncateToBucketStart(from, granularity); cursor <= end; cursor = stepBucket(cursor, granularity)) {
    buckets.push(cursor);
  }
  return buckets;
}

// Auto-picks a bucket width from the requested range so a year-long query
// doesn't come back as 365 single-day bars — the frontend range presets
// (last 30 days / this week/month/quarter/year / custom) don't specify a
// granularity themselves; this is the one place that decides it.
function pickGranularity(from: Date, to: Date): TimelineGranularity {
  const spanDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
  if (spanDays <= 62) return 'day';
  if (spanDays <= 370) return 'week';
  return 'month';
}

@Injectable()
export class AdminService {
  constructor(
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(EMPLOYER_EOI_MODEL) private readonly employerEoiModel: typeof EmployerEoi,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(STUDENT_PREFERENCE_MODEL) private readonly studentPreferenceModel: typeof StudentPreference,
    @Inject(INTERNSHIP_MODEL) private readonly internshipModel: typeof Internship,
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
    @Inject(INTERNSHIP_REQUEST_MODEL)
    private readonly internshipRequestModel: typeof InternshipRequest,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly configService: ConfigService,
  ) {}

  getSettings() {
    return this.platformSettingsService.getSettings();
  }

  updateSettings(dto: UpdateSettingsDto) {
    return this.platformSettingsService.updateSettings(dto);
  }

  // SQL-filterable columns only (status/q/hqCity/industryTags) — activation
  // is derived from Internship/InternshipApplication aggregates that have no
  // direct column to filter on, so it's applied in-memory afterward. Shared
  // by both the paginated list and the CSV export so what an admin previews
  // is exactly what they'd export — same "fine at admin-only, occasional-use
  // scale" tradeoff CandidatesService already makes for a hotter, employer-
  // facing endpoint (see match-score.util.ts's comment).
  private employerBaseWhere(query: QueryAdminEmployersDto): Record<string | symbol, unknown> {
    const where: Record<string | symbol, unknown> = {};
    if (query.status) where.verificationStatus = query.status;
    if (query.hqCity) where.hqCity = { [Op.iLike]: `%${query.hqCity}%` };
    if (query.industryTags?.length) {
      where[Op.and] = [
        {
          [Op.or]: query.industryTags.map((tag) =>
            sqlWhere(cast(col('industryTags'), 'text'), { [Op.iLike]: `%${tag}%` }),
          ),
        },
      ];
    }
    if (query.q) {
      where[Op.or] = [
        { organizationName: { [Op.iLike]: `%${query.q}%` } },
        sqlWhere(col('user.identifier'), { [Op.iLike]: `%${query.q}%` }),
      ];
    }
    return where;
  }

  // employerId -> { postedCount, activation }. cutoffDate gates 'dormant'
  // (posted before, nothing new since). Priority when more than one label
  // could apply: never_posted > zero_applicants > actively_hiring > dormant
  // > active — matches the order a marketing manager would actually care
  // about (an employer with 2 live roles and zero applicants is a "help
  // them get applicants" case, not a loyalty-campaign case).
  private async computeEmployerActivation(
    employerIds: number[],
    cutoffDate: Date,
  ): Promise<Map<number, { postedCount: number; activation: string }>> {
    const result = new Map<number, { postedCount: number; activation: string }>();
    if (employerIds.length === 0) return result;

    const internships = await this.internshipModel.findAll({
      attributes: ['id', 'employerId', 'status', 'createdAt'],
      where: { employerId: { [Op.in]: employerIds } },
      raw: true,
    });
    const internshipIds = internships.map((i) => (i as unknown as { id: number }).id);
    const applicantCounts = internshipIds.length
      ? ((await this.applicationModel.findAll({
          attributes: ['internshipId', [fn('COUNT', col('id')), 'count']],
          where: { internshipId: { [Op.in]: internshipIds } },
          group: ['internshipId'],
          raw: true,
        })) as unknown as Array<{ internshipId: number; count: string }>)
      : [];
    const applicantsByInternshipId = new Map(applicantCounts.map((r) => [r.internshipId, Number(r.count)]));

    for (const employerId of employerIds) {
      const own = internships.filter(
        (i) => (i as unknown as { employerId: number }).employerId === employerId,
      ) as unknown as Array<{ id: number; status: string; createdAt: string }>;
      const postedCount = own.length;
      const publishedCount = own.filter((i) => i.status === 'published').length;
      const totalApplicants = own.reduce((sum, i) => sum + (applicantsByInternshipId.get(i.id) ?? 0), 0);
      const lastPostedAt = own.length > 0 ? new Date(Math.max(...own.map((i) => new Date(i.createdAt).getTime()))) : null;

      let activation: string;
      if (postedCount === 0) activation = 'never_posted';
      else if (totalApplicants === 0) activation = 'zero_applicants';
      else if (publishedCount >= 2) activation = 'actively_hiring';
      else if (lastPostedAt && lastPostedAt < cutoffDate) activation = 'dormant';
      else activation = 'active';

      result.set(employerId, { postedCount, activation });
    }
    return result;
  }

  private async filteredEmployers(
    query: QueryAdminEmployersDto,
  ): Promise<Array<{ employer: Employer; postedCount: number; activation: string }>> {
    const rows = await this.employerModel.findAll({
      where: this.employerBaseWhere(query),
      include: [{ model: this.userModel, as: 'user', ...USER_SAFE_ATTRIBUTES }],
      order: [['createdAt', 'ASC']],
    });
    const windowDays = query.activityWindowDays ?? DEFAULT_ACTIVITY_WINDOW_DAYS;
    const cutoffDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const activationById = await this.computeEmployerActivation(rows.map((r) => r.id), cutoffDate);

    let combined = rows.map((employer) => ({
      employer,
      postedCount: activationById.get(employer.id)?.postedCount ?? 0,
      activation: activationById.get(employer.id)?.activation ?? 'never_posted',
    }));
    if (query.activation) {
      combined = combined.filter((c) => c.activation === query.activation);
    }
    return combined;
  }

  // Status filter is optional — omitted means every employer, regardless of
  // verification status, so admin can find an already-approved employer to
  // change its moderationMode (not just the pending-review queue).
  async getEmployers(query: QueryAdminEmployersDto) {
    const filtered = await this.filteredEmployers(query);
    const { page, pageSize, offset } = resolvePagination(this.configService, query);
    const pageRows = filtered.slice(offset, offset + pageSize);
    const items = pageRows.map(({ employer, postedCount, activation }) => ({
      ...employer.get({ plain: true }),
      postedCount,
      activation,
    }));
    return toPaginatedResult(items, filtered.length, page, pageSize);
  }

  // Full matching set, no pagination — CSV rows for a marketing manager to
  // upload into Mailchimp. Same filters as getEmployers, just unpaged.
  async exportEmployers(query: QueryAdminEmployersDto): Promise<string> {
    const filtered = await this.filteredEmployers(query);
    const rows = filtered.map(({ employer, postedCount, activation }) => ({
      email: employer.user?.identifier ?? '',
      organizationName: employer.organizationName ?? '',
      contactPersonName: employer.contactPersonName ?? '',
      contactPersonPhone: employer.contactPersonPhone ?? '',
      hqCity: employer.hqCity ?? '',
      industryTags: employer.industryTags.join('; '),
      verificationStatus: employer.verificationStatus,
      postedCount,
      activation,
      createdAt: employer.createdAt.toISOString(),
    }));
    return toCsv(rows, EMPLOYER_EXPORT_COLUMNS);
  }

  async setEmployerModerationMode(employerId: number, dto: UpdateEmployerModerationDto) {
    const employer = await this.employerModel.findByPk(employerId);
    if (!employer) {
      throw new NotFoundException('Employer not found.');
    }
    employer.moderationMode = dto.moderationMode;
    await employer.save();
    return employer;
  }

  // Approve moves a pending-review posting to published (visible in
  // browse); reject sends it back to draft so the employer can edit and
  // resubmit — same shape as the EOI approve/reject decision above, just for
  // a posting instead of an employer account.
  async moderateInternship(internshipUuid: string, dto: ModerateInternshipDto) {
    const internship = await this.internshipModel.findOne({ where: { uuid: internshipUuid } });
    if (!internship) {
      throw new NotFoundException('Internship not found.');
    }
    if (internship.status !== 'pending_review') {
      throw new ConflictException('This internship is not awaiting review.');
    }
    internship.status = dto.decision === 'approved' ? 'published' : 'draft';
    await internship.save();
    return serializeInternship(internship.get({ plain: true }));
  }

  // Lets the admin pull one or many live postings from public view in a
  // single call — a platform-level takedown, distinct from an employer's own
  // close(). Only 'published'/'pending_review' postings are meaningfully
  // "taken down"; anything already draft/closed/archived is left untouched
  // rather than erroring, so a mixed bulk selection doesn't fail the whole
  // batch over a no-op state transition.
  async takeDownInternships(uuids: string[]) {
    const internships = await this.internshipModel.findAll({ where: { uuid: uuids } });
    const foundUuids = new Set(internships.map((i) => i.uuid));
    const missingUuids = uuids.filter((uuid) => !foundUuids.has(uuid));
    if (missingUuids.length > 0) {
      throw new NotFoundException(`Internship(s) not found: ${missingUuids.join(', ')}`);
    }

    const takenDown = internships.filter((i) => i.status === 'published' || i.status === 'pending_review');
    await Promise.all(
      takenDown.map((internship) => {
        internship.status = 'closed';
        return internship.save();
      }),
    );

    return {
      takenDownIds: takenDown.map((i) => i.uuid),
      skippedIds: internships.filter((i) => !takenDown.includes(i)).map((i) => i.uuid),
    };
  }

  async getAllInternships(query: QueryAdminInternshipsDto) {
    const where: Record<string | symbol, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${query.q}%` } },
        sqlWhere(col('employer.organizationName'), { [Op.iLike]: `%${query.q}%` }),
      ];
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.internshipModel.findAndCountAll({
      where,
      include: [
        {
          model: this.employerModel,
          as: 'employer',
          attributes: ['id', 'organizationName', 'verificationStatus'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    const items = rows.map((row) => serializeInternship(row.get({ plain: true })));
    return toPaginatedResult(items, count, page, pageSize);
  }

  // SQL-filterable columns only (city/graduationYear range/skill/q) —
  // category (from StudentPreference, no direct association to join
  // through), profileComplete, and activity are applied in-memory
  // afterward. Same tradeoff/precedent as employerBaseWhere above.
  private studentBaseWhere(query: QueryAdminStudentsDto): Record<string | symbol, unknown> {
    const where: Record<string | symbol, unknown> = {};
    if (query.city) where.city = { [Op.iLike]: `%${query.city}%` };
    if (query.graduationYearMin || query.graduationYearMax) {
      const range: Record<symbol, number> = {};
      if (query.graduationYearMin) range[Op.gte] = query.graduationYearMin;
      if (query.graduationYearMax) range[Op.lte] = query.graduationYearMax;
      where.graduationYear = range;
    }
    if (query.skill) {
      where[Op.and] = [sqlWhere(cast(col('skills'), 'text'), { [Op.iLike]: `%${query.skill}%` })];
    }
    if (query.q) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${query.q}%` } },
        { collegeName: { [Op.iLike]: `%${query.q}%` } },
        sqlWhere(col('user.identifier'), { [Op.iLike]: `%${query.q}%` }),
      ];
    }
    return where;
  }

  private async getActiveStudentIds(studentIds: number[], cutoffDate: Date): Promise<Set<number>> {
    if (studentIds.length === 0) return new Set();
    const rows = await this.applicationModel.findAll({
      attributes: ['studentId'],
      where: { studentId: { [Op.in]: studentIds }, createdAt: { [Op.gte]: cutoffDate } },
      group: ['studentId'],
      raw: true,
    });
    return new Set((rows as unknown as Array<{ studentId: number }>).map((r) => r.studentId));
  }

  private async filteredStudents(
    query: QueryAdminStudentsDto,
  ): Promise<Array<{ student: Student; preferences: StudentPreference | null; profileComplete: boolean; activity: 'active' | 'dormant' }>> {
    const rows = await this.studentModel.findAll({
      where: this.studentBaseWhere(query),
      include: [{ model: this.userModel, as: 'user', ...USER_SAFE_ATTRIBUTES }],
      order: [['createdAt', 'DESC']],
    });
    const preferenceRows = await this.studentPreferenceModel.findAll({
      where: { studentId: { [Op.in]: rows.map((r) => r.id) } },
    });
    const preferencesById = new Map(preferenceRows.map((p) => [p.studentId, p]));

    const windowDays = query.activityWindowDays ?? DEFAULT_ACTIVITY_WINDOW_DAYS;
    const cutoffDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const activeIds = await this.getActiveStudentIds(rows.map((r) => r.id), cutoffDate);

    let combined = rows.map((student) => ({
      student,
      preferences: preferencesById.get(student.id) ?? null,
      profileComplete: isStudentProfileComplete(student),
      activity: (activeIds.has(student.id) ? 'active' : 'dormant') as 'active' | 'dormant',
    }));

    if (query.category?.length) {
      combined = combined.filter((c) =>
        query.category!.some((cat) => c.preferences?.preferredCategories.includes(cat)),
      );
    }
    if (query.profileComplete !== undefined) {
      combined = combined.filter((c) => c.profileComplete === query.profileComplete);
    }
    if (query.activity) {
      combined = combined.filter((c) => c.activity === query.activity);
    }
    return combined;
  }

  async getAllStudents(query: QueryAdminStudentsDto) {
    const filtered = await this.filteredStudents(query);
    const { page, pageSize, offset } = resolvePagination(this.configService, query);
    const pageRows = filtered.slice(offset, offset + pageSize);
    const items = pageRows.map(({ student, profileComplete, activity }) => ({
      ...student.get({ plain: true }),
      profileComplete,
      activity,
    }));
    return toPaginatedResult(items, filtered.length, page, pageSize);
  }

  // Full matching set, no pagination — CSV rows for a marketing manager to
  // upload into Mailchimp. Same filters as getAllStudents, just unpaged.
  async exportStudents(query: QueryAdminStudentsDto): Promise<string> {
    const filtered = await this.filteredStudents(query);
    const rows = filtered.map(({ student, preferences, profileComplete, activity }) => ({
      email: student.user?.identifier ?? '',
      fullName: student.fullName ?? '',
      phone: student.phone ?? '',
      collegeName: student.collegeName ?? '',
      course: student.course ?? '',
      graduationYear: student.graduationYear ?? '',
      city: student.city ?? '',
      skills: student.skills.join('; '),
      preferredCategories: preferences?.preferredCategories.join('; ') ?? '',
      profileComplete: profileComplete ? 'yes' : 'no',
      activity,
      createdAt: student.createdAt.toISOString(),
    }));
    return toCsv(rows, STUDENT_EXPORT_COLUMNS);
  }

  async getDashboardStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      studentsTotal,
      studentsNew,
      employersTotal,
      employersNew,
      employerEoisByStatus,
      internshipsByStatus,
      applicationsTotal,
      internshipRequestsTotal,
      settings,
    ] = await Promise.all([
      this.studentModel.count(),
      this.studentModel.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } }),
      this.employerModel.count(),
      this.employerModel.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } }),
      // The real onboarding funnel now — every Employer row is always
      // 'approved' at creation, so a status breakdown of *that* model is
      // meaningless. EmployerEoi is where pending/approved/rejected still
      // means something.
      this.employerEoiModel.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      this.internshipModel.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      this.applicationModel.count(),
      this.internshipRequestModel.count(),
      this.platformSettingsService.getSettings(),
    ]);

    const employerEois = { total: 0, pending: 0, approved: 0, rejected: 0 };
    for (const row of employerEoisByStatus as unknown as Array<{
      status: keyof typeof employerEois;
      count: string;
    }>) {
      const count = Number(row.count);
      employerEois.total += count;
      employerEois[row.status] = count;
    }

    const internships = {
      total: 0,
      draft: 0,
      pending_review: 0,
      published: 0,
      closed: 0,
      archived: 0,
    };
    for (const row of internshipsByStatus as unknown as Array<{
      status: keyof typeof internships;
      count: string;
    }>) {
      const count = Number(row.count);
      internships.total += count;
      internships[row.status] = count;
    }

    return {
      students: { total: studentsTotal, newLast7Days: studentsNew },
      employers: { total: employersTotal, newLast7Days: employersNew },
      employerEois,
      internships,
      applications: { total: applicationsTotal },
      internshipRequests: { total: internshipRequestsTotal },
      employerRegistrationOpen: settings.employerRegistrationOpen,
    };
  }

  async getDashboardTimeline(query: QueryDashboardTimelineDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const granularity = pickGranularity(from, to);
    const bucketDates = generateBuckets(from, to, granularity);
    const bucketKeys = bucketDates.map((d) => d.toISOString());

    const bucketTrunc = (column: string) => fn('date_trunc', granularity, col(column));

    const toCounts = (rows: Array<{ bucket: string | Date; count: string }>): number[] => {
      const byBucket = new Map(rows.map((r) => [new Date(r.bucket).toISOString(), Number(r.count)]));
      return bucketKeys.map((key) => byBucket.get(key) ?? 0);
    };

    const [studentsRows, employersRows, internshipsRows, offeredRows] = (await Promise.all([
      this.studentModel.findAll({
        attributes: [[bucketTrunc('createdAt'), 'bucket'], [fn('COUNT', col('id')), 'count']],
        where: { createdAt: { [Op.between]: [from, to] } },
        group: [bucketTrunc('createdAt')],
        raw: true,
      }),
      this.employerModel.findAll({
        attributes: [[bucketTrunc('createdAt'), 'bucket'], [fn('COUNT', col('id')), 'count']],
        where: { createdAt: { [Op.between]: [from, to] } },
        group: [bucketTrunc('createdAt')],
        raw: true,
      }),
      this.internshipModel.findAll({
        attributes: [[bucketTrunc('createdAt'), 'bucket'], [fn('COUNT', col('id')), 'count']],
        where: { createdAt: { [Op.between]: [from, to] } },
        group: [bucketTrunc('createdAt')],
        raw: true,
      }),
      // 'offered' has no dedicated timestamp column — the application row's
      // own updatedAt is the last time its status changed, which for a row
      // currently sitting at 'offered' is exactly the moment it became so.
      this.applicationModel.findAll({
        attributes: [[bucketTrunc('updatedAt'), 'bucket'], [fn('COUNT', col('id')), 'count']],
        where: { status: 'offered', updatedAt: { [Op.between]: [from, to] } },
        group: [bucketTrunc('updatedAt')],
        raw: true,
      }),
    ])) as unknown as Array<Array<{ bucket: string; count: string }>>;

    return {
      granularity,
      buckets: bucketKeys,
      series: {
        studentsCreated: toCounts(studentsRows),
        employersRegistered: toCounts(employersRows),
        internshipsPosted: toCounts(internshipsRows),
        internshipsOffered: toCounts(offeredRows),
      },
    };
  }

  // "Active"/"dormant" here means posting activity (employers) or
  // application activity (students) specifically — there is no login/
  // session timestamp anywhere in this schema to measure actual usage
  // against, and this dashboard should never claim more than the data
  // backs up.
  async getGrowthInsights() {
    const now = Date.now();
    const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const [
      employerPostedLast30Days,
      eligibleEmployers,
      topPosterRows,
      studentAppliedLast30Days,
      eligibleStudents,
      liveOrClosedInternships,
      internshipsWithApplications,
      applicationsTotal,
      offeredCount,
      rejectedCount,
      unmetDemandRows,
    ] = await Promise.all([
      this.internshipModel.count({
        distinct: true,
        col: 'employerId',
        where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
      }),
      // Grace period: an employer approved 3 days ago hasn't had a fair
      // chance to post yet — only accounts old enough to reasonably expect
      // a first posting count toward the dormant total.
      this.employerModel.findAll({
        where: { verificationStatus: 'approved', createdAt: { [Op.lte]: fourteenDaysAgo } },
        attributes: ['id'],
        raw: true,
      }) as unknown as Promise<Array<{ id: number }>>,
      this.internshipModel.findAll({
        attributes: [
          'employerId',
          [fn('COUNT', col('id')), 'internshipCount'],
          [fn('MAX', col('createdAt')), 'lastPostedAt'],
        ],
        group: ['employerId'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        limit: 5,
        raw: true,
      }) as unknown as Promise<Array<{ employerId: number; internshipCount: string; lastPostedAt: string }>>,
      this.applicationModel.count({
        distinct: true,
        col: 'studentId',
        where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
      }),
      this.studentModel.findAll({
        where: { createdAt: { [Op.lte]: fourteenDaysAgo } },
        attributes: ['id'],
        raw: true,
      }) as unknown as Promise<Array<{ id: number }>>,
      this.internshipModel.count({ where: { status: { [Op.in]: ['published', 'closed'] } } }),
      // Any internshipId with an application row must have been published
      // at some point (applying to a draft is not a reachable path) — this
      // count is a safe proxy for "internships that ever got any interest."
      this.applicationModel.count({ distinct: true, col: 'internshipId' }),
      this.applicationModel.count(),
      this.applicationModel.count({ where: { status: 'offered' } }),
      this.applicationModel.count({ where: { status: 'rejected' } }),
      this.internshipRequestModel.findAll({
        attributes: ['domain', [fn('COUNT', col('id')), 'requestCount']],
        group: ['domain'],
        order: [[fn('COUNT', col('id')), 'DESC']],
        limit: 6,
        raw: true,
      }) as unknown as Promise<Array<{ domain: string; requestCount: string }>>,
    ]);

    const activeEmployerIds = new Set(
      (
        await this.internshipModel.findAll({
          attributes: ['employerId'],
          where: {
            employerId: { [Op.in]: eligibleEmployers.map((e) => e.id) },
            createdAt: { [Op.gte]: sixtyDaysAgo },
          },
          group: ['employerId'],
          raw: true,
        })
      ).map((r) => (r as unknown as { employerId: number }).employerId),
    );
    const dormantEmployers = eligibleEmployers.length - activeEmployerIds.size;

    const activeStudentIds = new Set(
      (
        await this.applicationModel.findAll({
          attributes: ['studentId'],
          where: {
            studentId: { [Op.in]: eligibleStudents.map((s) => s.id) },
            createdAt: { [Op.gte]: sixtyDaysAgo },
          },
          group: ['studentId'],
          raw: true,
        })
      ).map((r) => (r as unknown as { studentId: number }).studentId),
    );
    const dormantStudents = eligibleStudents.length - activeStudentIds.size;

    const topPosterEmployers = await this.employerModel.findAll({
      where: { id: topPosterRows.map((r) => r.employerId) },
      attributes: ['id', 'organizationName'],
      raw: true,
    });
    const orgNameByEmployerId = new Map(
      (topPosterEmployers as unknown as Array<{ id: number; organizationName: string | null }>).map((e) => [
        e.id,
        e.organizationName,
      ]),
    );
    const topPosters = topPosterRows.map((r) => ({
      employerId: r.employerId,
      organizationName: orgNameByEmployerId.get(r.employerId) ?? 'Unknown organization',
      internshipCount: Number(r.internshipCount),
      lastPostedAt: r.lastPostedAt,
    }));

    const decidedApplications = offeredCount + rejectedCount;

    return {
      employerEngagement: {
        postedLast30Days: employerPostedLast30Days,
        dormant: dormantEmployers,
        topPosters,
      },
      studentEngagement: {
        appliedLast30Days: studentAppliedLast30Days,
        dormant: dormantStudents,
      },
      matchQuality: {
        publishedInternships: liveOrClosedInternships,
        internshipsWithZeroApplications: Math.max(
          0,
          liveOrClosedInternships - internshipsWithApplications,
        ),
        avgApplicationsPerInternship:
          liveOrClosedInternships > 0 ? applicationsTotal / liveOrClosedInternships : 0,
        offerRate: decidedApplications > 0 ? offeredCount / decidedApplications : 0,
      },
      unmetDemand: unmetDemandRows.map((r) => ({ domain: r.domain, requestCount: Number(r.requestCount) })),
    };
  }
}
