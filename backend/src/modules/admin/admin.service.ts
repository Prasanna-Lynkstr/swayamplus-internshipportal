import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EMPLOYER_MODEL, USER_MODEL } from '../../database/database.constants.js';
import { Employer, User } from '../../database/models/index.js';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';
import { VerifyEmployerDto } from './dto/verify-employer.dto.js';

@Injectable()
export class AdminService {
  constructor(
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getSettings() {
    return this.platformSettingsService.getSettings();
  }

  updateSettings(dto: UpdateSettingsDto) {
    return this.platformSettingsService.updateSettings(dto);
  }

  getPendingEmployers() {
    return this.employerModel.findAll({
      where: { verificationStatus: 'pending' },
      include: [{ model: this.userModel, as: 'user' }],
      order: [['createdAt', 'ASC']],
    });
  }

  async verifyEmployer(employerId: number, dto: VerifyEmployerDto) {
    const employer = await this.employerModel.findByPk(employerId, {
      include: [{ model: this.userModel, as: 'user' }],
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
}
