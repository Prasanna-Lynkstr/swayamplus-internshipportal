import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { col, fn } from '@sequelize/core';
import {
  EMPLOYER_MODEL,
  INTERNSHIP_APPLICATION_MODEL,
  INTERNSHIP_MODEL,
} from '../../database/database.constants.js';
import { Employer, Internship, InternshipApplication } from '../../database/models/index.js';
import type { InternshipStatus } from '../../database/models/internship.model.js';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import type { StorageService, UploadableFile } from '../storage/storage.types.js';
import { RegisterEmployerDto } from './dto/register-employer.dto.js';
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
  ) {}

  async getRegistrationStatus() {
    const settings = await this.platformSettingsService.getSettings();
    return { open: settings.employerRegistrationOpen };
  }

  async register(userId: number, dto: RegisterEmployerDto): Promise<Employer> {
    const settings = await this.platformSettingsService.getSettings();
    if (!settings.employerRegistrationOpen) {
      throw new ForbiddenException('Employer registration is currently closed.');
    }

    const employer = await this.getByUserId(userId);
    employer.set(dto);
    if (settings.autoApproveEmployers && employer.verificationStatus === 'pending') {
      employer.verificationStatus = 'approved';
    }
    await employer.save();
    return employer;
  }

  async getByUserId(userId: number): Promise<Employer> {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    return employer;
  }

  async updateByUserId(userId: number, dto: UpdateEmployerDto): Promise<Employer> {
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
    if (employer.verificationStatus === 'rejected') {
      employer.verificationStatus = 'pending';
    }
    await employer.save();
    return employer;
  }

  async getDashboardStats(userId: number) {
    const employer = await this.getByUserId(userId);

    const [internshipsByStatus, applicationsTotal, pendingReview] = await Promise.all([
      this.internshipModel.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        where: { employerId: employer.id },
        group: ['status'],
        raw: true,
      }),
      this.applicationModel.count({
        include: [
          { model: this.internshipModel, as: 'internship', where: { employerId: employer.id }, attributes: [] },
        ],
      }),
      this.applicationModel.count({
        where: { status: 'applied' },
        include: [
          { model: this.internshipModel, as: 'internship', where: { employerId: employer.id }, attributes: [] },
        ],
      }),
    ]);

    const internships: Record<'total' | InternshipStatus, number> = {
      total: 0,
      draft: 0,
      published: 0,
      closed: 0,
      archived: 0,
    };
    for (const row of internshipsByStatus as unknown as Array<{ status: InternshipStatus; count: string }>) {
      const count = Number(row.count);
      internships.total += count;
      internships[row.status] = count;
    }

    return {
      internships,
      applications: { total: applicationsTotal, pendingReview },
      verificationStatus: employer.verificationStatus,
    };
  }
}
