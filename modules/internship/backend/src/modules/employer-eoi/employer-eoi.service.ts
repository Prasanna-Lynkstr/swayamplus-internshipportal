import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op, Sequelize } from '@sequelize/core';
import {
  EMPLOYER_EOI_MODEL,
  EMPLOYER_MODEL,
  SEQUELIZE,
  USER_MODEL,
} from '../../database/database.constants.js';
import { Employer, EmployerEoi, User } from '../../database/models/index.js';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service.js';
import { TaxonomiesService } from '../taxonomies/taxonomies.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import type { StorageService, UploadableFile } from '../storage/storage.types.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateEmployerEoiDto } from './dto/create-employer-eoi.dto.js';
import { QueryEmployerEoiDto } from './dto/query-employer-eoi.dto.js';

@Injectable()
export class EmployerEoiService {
  constructor(
    @Inject(EMPLOYER_EOI_MODEL) private readonly employerEoiModel: typeof EmployerEoi,
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
    @Inject(SEQUELIZE) private readonly sequelize: Sequelize,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  private get submitLimitPerEmail(): number {
    return this.configService.get<number>('EOI_SUBMIT_LIMIT_PER_EMAIL', 3);
  }

  private get submitLimitPerIp(): number {
    return this.configService.get<number>('EOI_SUBMIT_LIMIT_PER_IP', 10);
  }

  // Config-driven Postgres-row-count throttle, same shape as
  // AuthService.requestOtp's — this is a public write endpoint with a file
  // upload attached and no auth in front of it at all, the first of its
  // kind in this backend, so it needs at least this much before it exists.
  private async assertNotThrottled(email: string, ip: string | null): Promise<void> {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const emailCount = await this.employerEoiModel.count({
      where: { email, createdAt: { [Op.gte]: dayAgo } },
    });
    if (emailCount >= this.submitLimitPerEmail) {
      throw new HttpException(
        'Too many submissions from this email. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (ip) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const ipCount = await this.employerEoiModel.count({
        where: { submittedIp: ip, createdAt: { [Op.gte]: hourAgo } },
      });
      if (ipCount >= this.submitLimitPerIp) {
        throw new HttpException(
          'Too many submissions from this network. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  private async emailInUse(email: string): Promise<boolean> {
    const existing = await this.userModel.findOne({ where: { identifier: email, role: 'employer' } });
    return existing !== null;
  }

  async create(dto: CreateEmployerEoiDto, file: UploadableFile, ip: string | null): Promise<EmployerEoi> {
    const settings = await this.platformSettingsService.getSettings();
    if (!settings.employerRegistrationOpen) {
      throw new ForbiddenException('Employer registration is currently closed.');
    }

    await this.assertNotThrottled(dto.email, ip);
    await this.taxonomiesService.assertValid('internship_category', dto.internshipTypesExpected);

    const certificateOfIncorporationUrl = await this.storageService.save(file, 'eoi-documents');
    const { acceptTerms: _acceptTerms, ...fields } = dto;

    const eoi = await this.employerEoiModel.create({
      ...fields,
      certificateOfIncorporationUrl,
      acceptedTermsAt: new Date(),
      submittedIp: ip,
    });

    // Mirrors the old direct-registration flow's autoApproveEmployers
    // behavior — an admin who's turned this on shouldn't find submissions
    // piling up in a queue nobody reviews.
    if (settings.autoApproveEmployers) {
      await this.convert(eoi);
    }

    return eoi;
  }

  async findAll(query: QueryEmployerEoiDto) {
    const where: Record<string | symbol, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      where[Op.or] = [
        { organizationName: { [Op.iLike]: `%${query.q}%` } },
        { email: { [Op.iLike]: `%${query.q}%` } },
      ];
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.employerEoiModel.findAndCountAll({
      where,
      order: [['createdAt', 'ASC']],
      limit: pageSize,
      offset,
    });

    // One batched query for the whole page, not one per row.
    const emails = rows.map((row) => row.email);
    const existingUsers = emails.length
      ? await this.userModel.findAll({
          where: { identifier: { [Op.in]: emails }, role: 'employer' },
          attributes: ['identifier'],
        })
      : [];
    const inUse = new Set(existingUsers.map((user) => user.identifier));

    const items = rows.map((row) => ({ ...row.get({ plain: true }), emailInUse: inUse.has(row.email) }));
    return toPaginatedResult(items, count, page, pageSize);
  }

  private async getPending(id: number): Promise<EmployerEoi> {
    const eoi = await this.employerEoiModel.findByPk(id);
    if (!eoi) {
      throw new NotFoundException('Submission not found.');
    }
    if (eoi.status !== 'pending') {
      throw new ConflictException('This submission has already been decided.');
    }
    return eoi;
  }

  async updateEmail(id: number, email: string) {
    const eoi = await this.getPending(id);
    eoi.email = email;
    await eoi.save();
    return { ...eoi.get({ plain: true }), emailInUse: await this.emailInUse(email) };
  }

  async decide(id: number, adminUserId: number, status: 'approved' | 'rejected'): Promise<EmployerEoi | Employer> {
    const eoi = await this.getPending(id);

    if (status === 'rejected') {
      eoi.status = 'rejected';
      eoi.decidedAt = new Date();
      eoi.decidedByAdminUserId = adminUserId;
      await eoi.save();
      this.notificationsService.notifyEoiRejected(eoi.email);
      return eoi;
    }

    // Re-checked here even though the admin UI already shows this state —
    // never trust client state for the one decision that provisions a real
    // account. A race (two admins, or the email self-registering via some
    // other path in between) still gets caught.
    if (await this.emailInUse(eoi.email)) {
      throw new ConflictException(
        'An employer account already exists for this email. Edit the email and try again.',
      );
    }

    return this.convert(eoi, adminUserId);
  }

  // Shared by the admin-approval path and the autoApproveEmployers path at
  // submission time — creates the real account and marks the EOI converted,
  // atomically, so a crash mid-way never leaves a User with no Employer or
  // an EOI stuck claiming a conversion that didn't happen.
  private async convert(eoi: EmployerEoi, adminUserId?: number): Promise<Employer> {
    const employer = await this.sequelize.transaction(async (transaction) => {
      const user = await this.userModel.create(
        { identifier: eoi.email, role: 'employer', passwordHash: null, isActive: true },
        { transaction },
      );
      const created = await this.employerModel.create(
        {
          userId: user.id,
          organizationName: eoi.organizationName,
          contactPersonName: eoi.contactPersonName,
          contactPersonPhone: eoi.contactPersonPhone,
          reasonForEoi: eoi.reasonForEoi,
          cin: eoi.cin,
          certificateOfIncorporationUrl: eoi.certificateOfIncorporationUrl,
          headcount: eoi.headcount,
          linkedinBusinessPage: eoi.linkedinBusinessPage,
          website: eoi.website,
          hqCity: eoi.hqCity,
          internshipTypesExpected: eoi.internshipTypesExpected,
          industryTags: eoi.industryTags,
          verificationStatus: 'approved',
          acceptedTermsAt: eoi.acceptedTermsAt,
        },
        { transaction },
      );
      eoi.status = 'approved';
      eoi.decidedAt = new Date();
      eoi.decidedByAdminUserId = adminUserId ?? null;
      eoi.convertedEmployerId = created.id;
      await eoi.save({ transaction });
      return created;
    });

    this.notificationsService.notifyEoiApproved(eoi.email);
    return employer;
  }
}
