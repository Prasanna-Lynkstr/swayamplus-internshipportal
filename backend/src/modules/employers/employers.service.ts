import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EMPLOYER_MODEL } from '../../database/database.constants.js';
import { Employer } from '../../database/models/index.js';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import type { StorageService, UploadableFile } from '../storage/storage.types.js';
import { RegisterEmployerDto } from './dto/register-employer.dto.js';
import { UpdateEmployerDto } from './dto/update-employer.dto.js';

@Injectable()
export class EmployersService {
  constructor(
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
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

  async saveVerificationDocument(userId: number, file: UploadableFile): Promise<Employer> {
    const employer = await this.getByUserId(userId);
    employer.verificationDocumentUrl = await this.storageService.save(file, 'verification-documents');
    if (employer.verificationStatus === 'rejected') {
      employer.verificationStatus = 'pending';
    }
    await employer.save();
    return employer;
  }
}
