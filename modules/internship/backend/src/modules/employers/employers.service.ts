import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { col, fn } from '@sequelize/core';
import {
  EMPLOYER_MODEL,
  INTERNSHIP_APPLICATION_MODEL,
  INTERNSHIP_MODEL,
} from '../../database/database.constants.js';
import { Employer, Internship, InternshipApplication } from '../../database/models/index.js';
import type { InternshipStatus } from '../../database/models/internship.model.js';
import type { ApplicationStatus } from '../../database/models/internship-application.model.js';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import type { StorageService, UploadableFile } from '../storage/storage.types.js';
import { TaxonomiesService } from '../taxonomies/taxonomies.service.js';
import { UpdateEmployerDto } from './dto/update-employer.dto.js';

@Injectable()
export class EmployersService {
  constructor(
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(INTERNSHIP_MODEL) private readonly internshipModel: typeof Internship,
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
    private readonly platformSettingsService: PlatformSettingsService,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
    private readonly taxonomiesService: TaxonomiesService,
  ) {}

  async getRegistrationStatus() {
    const settings = await this.platformSettingsService.getSettings();
    return { open: settings.employerRegistrationOpen };
  }

  async getByUserId(userId: number): Promise<Employer> {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    return employer;
  }

  // Public "company page" info — deliberately a narrow whitelist, not the
  // full model (no CIN, reason for EOI, headcount, etc.). 404s for anything
  // not approved so an unapproved/rejected employer's existence isn't
  // confirmable by id-guessing.
  async getPublicProfile(employerId: number) {
    const employer = await this.employerModel.findByPk(employerId);
    if (!employer || employer.verificationStatus !== 'approved') {
      throw new NotFoundException('Employer not found.');
    }
    return {
      id: employer.id,
      organizationName: employer.organizationName,
      website: employer.website,
      logoUrl: employer.logoUrl,
      hqCity: employer.hqCity,
      industryTags: employer.industryTags,
      headcount: employer.headcount,
      internshipTypesExpected: employer.internshipTypesExpected,
      linkedinBusinessPage: employer.linkedinBusinessPage,
    };
  }

  async updateByUserId(userId: number, dto: UpdateEmployerDto): Promise<Employer> {
    await this.taxonomiesService.assertValid('internship_category', dto.internshipTypesExpected);

    const employer = await this.getByUserId(userId);
    employer.set(dto);
    await employer.save();
    return employer;
  }

  async saveCertificateOfIncorporation(userId: number, file: UploadableFile): Promise<Employer> {
    const employer = await this.getByUserId(userId);
    employer.certificateOfIncorporationUrl = await this.storageService.save(
      file,
      'verification-documents',
    );
    await employer.save();
    return employer;
  }

  async saveLogo(userId: number, file: UploadableFile): Promise<Employer> {
    const employer = await this.getByUserId(userId);
    const previousLogoUrl = employer.logoUrl;
    employer.logoUrl = await this.storageService.save(file, 'logos');
    await employer.save();
    // Delete after the new URL is safely persisted, not before — a failed
    // save should never leave an employer with neither the old nor new logo.
    if (previousLogoUrl) {
      await this.storageService.delete(previousLogoUrl);
    }
    return employer;
  }

  async deleteLogo(userId: number): Promise<Employer> {
    const employer = await this.getByUserId(userId);
    if (employer.logoUrl) {
      await this.storageService.delete(employer.logoUrl);
      employer.logoUrl = null;
      await employer.save();
    }
    return employer;
  }

  async getDashboardStats(userId: number) {
    const employer = await this.getByUserId(userId);

    const [internshipsByStatus, internshipIds] = await Promise.all([
      this.internshipModel.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        where: { employerId: employer.id },
        group: ['status'],
        raw: true,
      }),
      this.internshipModel.findAll({
        attributes: ['id'],
        where: { employerId: employer.id },
        raw: true,
      }),
    ]);

    // Grouping applications straight off a join to `internships` would group
    // by an ambiguous `status` column — both tables have one. Scoping by a
    // plain `internshipId IN (...)` (ids fetched above) sidesteps that
    // entirely, same as InternshipsService.findMine's applicationsCount query.
    const ids = (internshipIds as unknown as Array<{ id: number }>).map((r) => r.id);
    const applicationsByStatus = ids.length
      ? await this.applicationModel.findAll({
          attributes: ['status', [fn('COUNT', col('id')), 'count']],
          where: { internshipId: ids },
          group: ['status'],
          raw: true,
        })
      : [];

    const internships: Record<'total' | InternshipStatus, number> = {
      total: 0,
      draft: 0,
      pending_review: 0,
      published: 0,
      closed: 0,
      archived: 0,
    };
    for (const row of internshipsByStatus as unknown as Array<{ status: InternshipStatus; count: string }>) {
      const count = Number(row.count);
      internships.total += count;
      internships[row.status] = count;
    }

    // 'pendingReview' names the 'applied' status for this response — an
    // applicant who hasn't been actioned yet — kept as-is since the
    // frontend's "Awaiting review" card already reads this field.
    const applications = {
      total: 0,
      pendingReview: 0,
      shortlisted: 0,
      interviewing: 0,
      offered: 0,
      rejected: 0,
      withdrawn: 0,
    };
    for (const row of applicationsByStatus as unknown as Array<{
      status: ApplicationStatus;
      count: string;
    }>) {
      const count = Number(row.count);
      applications.total += count;
      if (row.status === 'applied') applications.pendingReview = count;
      else applications[row.status] = count;
    }

    return {
      internships,
      applications,
      verificationStatus: employer.verificationStatus,
    };
  }
}
