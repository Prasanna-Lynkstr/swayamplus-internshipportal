import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op, col, fn, where as sqlWhere } from '@sequelize/core';
import {
  EMPLOYER_MODEL,
  INTERNSHIP_APPLICATION_MODEL,
  INTERNSHIP_MODEL,
  INTERNSHIP_REQUEST_MODEL,
  STUDENT_MODEL,
  USER_MODEL,
} from '../../database/database.constants.js';
import {
  Employer,
  Internship,
  InternshipApplication,
  InternshipRequest,
  Student,
  User,
} from '../../database/models/index.js';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { VerifyEmployerDto } from './dto/verify-employer.dto.js';
import { QueryAdminInternshipsDto } from './dto/query-admin-internships.dto.js';
import { QueryAdminEmployersDto } from './dto/query-admin-employers.dto.js';
import { QueryAdminStudentsDto } from './dto/query-admin-students.dto.js';
import { ModerateInternshipDto } from './dto/moderate-internship.dto.js';
import { UpdateEmployerModerationDto } from './dto/update-employer-moderation.dto.js';
import { QueryDashboardTimelineDto } from './dto/query-dashboard-timeline.dto.js';

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

// Never include the full User model without excluding passwordHash — this
// is the one field on the whole schema that must never leave the process.
const USER_ASSOCIATION_SAFE = {
  attributes: { exclude: ['passwordHash'] },
};

@Injectable()
export class AdminService {
  constructor(
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(INTERNSHIP_MODEL) private readonly internshipModel: typeof Internship,
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
    @Inject(INTERNSHIP_REQUEST_MODEL)
    private readonly internshipRequestModel: typeof InternshipRequest,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  getSettings() {
    return this.platformSettingsService.getSettings();
  }

  updateSettings(dto: UpdateSettingsDto) {
    return this.platformSettingsService.updateSettings(dto);
  }

  // Status filter is optional — omitted means every employer, regardless of
  // verification status, so admin can find an already-approved employer to
  // change its moderationMode (not just the pending-review queue).
  async getEmployers(query: QueryAdminEmployersDto) {
    const where: Record<string | symbol, unknown> = {};
    if (query.status) where.verificationStatus = query.status;
    if (query.q) {
      where[Op.or] = [
        { organizationName: { [Op.iLike]: `%${query.q}%` } },
        sqlWhere(col('user.identifier'), { [Op.iLike]: `%${query.q}%` }),
      ];
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.employerModel.findAndCountAll({
      where,
      include: [{ model: this.userModel, as: 'user', ...USER_ASSOCIATION_SAFE }],
      order: [['createdAt', 'ASC']],
      limit: pageSize,
      offset,
    });

    return toPaginatedResult(rows, count, page, pageSize);
  }

  async verifyEmployer(employerId: number, dto: VerifyEmployerDto) {
    const employer = await this.employerModel.findByPk(employerId, {
      include: [{ model: this.userModel, as: 'user', ...USER_ASSOCIATION_SAFE }],
    });
    if (!employer) {
      throw new NotFoundException('Employer not found.');
    }

    employer.verificationStatus = dto.status;
    await employer.save();

    const employerEmail = employer.user?.identifier;
    if (employerEmail) {
      this.notificationsService.notifyEmployerVerificationDecision(employerEmail, dto.status);
    }

    return employer;
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
  async moderateInternship(internshipId: number, dto: ModerateInternshipDto) {
    const internship = await this.internshipModel.findByPk(internshipId);
    if (!internship) {
      throw new NotFoundException('Internship not found.');
    }
    if (internship.status !== 'pending_review') {
      throw new ConflictException('This internship is not awaiting review.');
    }
    internship.status = dto.decision === 'approved' ? 'published' : 'draft';
    await internship.save();
    return internship;
  }

  // Lets the admin pull one or many live postings from public view in a
  // single call — a platform-level takedown, distinct from an employer's own
  // close(). Only 'published'/'pending_review' postings are meaningfully
  // "taken down"; anything already draft/closed/archived is left untouched
  // rather than erroring, so a mixed bulk selection doesn't fail the whole
  // batch over a no-op state transition.
  async takeDownInternships(ids: number[]) {
    const internships = await this.internshipModel.findAll({ where: { id: ids } });
    const foundIds = new Set(internships.map((i) => i.id));
    const missingIds = ids.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(`Internship(s) not found: ${missingIds.join(', ')}`);
    }

    const takenDown = internships.filter((i) => i.status === 'published' || i.status === 'pending_review');
    await Promise.all(
      takenDown.map((internship) => {
        internship.status = 'closed';
        return internship.save();
      }),
    );

    return {
      takenDownIds: takenDown.map((i) => i.id),
      skippedIds: internships.filter((i) => !takenDown.includes(i)).map((i) => i.id),
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

    return toPaginatedResult(rows, count, page, pageSize);
  }

  async getAllStudents(query: QueryAdminStudentsDto) {
    const where: Record<string | symbol, unknown> = {};
    if (query.q) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${query.q}%` } },
        { collegeName: { [Op.iLike]: `%${query.q}%` } },
        sqlWhere(col('user.identifier'), { [Op.iLike]: `%${query.q}%` }),
      ];
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.studentModel.findAndCountAll({
      where,
      include: [{ model: this.userModel, as: 'user', ...USER_ASSOCIATION_SAFE }],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return toPaginatedResult(rows, count, page, pageSize);
  }

  async getDashboardStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      studentsTotal,
      studentsNew,
      employersByStatus,
      employersNew,
      internshipsByStatus,
      applicationsTotal,
      internshipRequestsTotal,
      settings,
    ] = await Promise.all([
      this.studentModel.count(),
      this.studentModel.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } }),
      this.employerModel.findAll({
        attributes: ['verificationStatus', [fn('COUNT', col('id')), 'count']],
        group: ['verificationStatus'],
        raw: true,
      }),
      this.employerModel.count({ where: { createdAt: { [Op.gte]: sevenDaysAgo } } }),
      this.internshipModel.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      this.applicationModel.count(),
      this.internshipRequestModel.count(),
      this.platformSettingsService.getSettings(),
    ]);

    const employers = { total: 0, pending: 0, approved: 0, rejected: 0 };
    for (const row of employersByStatus as unknown as Array<{
      verificationStatus: keyof typeof employers;
      count: string;
    }>) {
      const count = Number(row.count);
      employers.total += count;
      employers[row.verificationStatus] = count;
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
      employers: { ...employers, newLast7Days: employersNew },
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
}
