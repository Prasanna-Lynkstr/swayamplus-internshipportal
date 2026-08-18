import { Inject, Injectable } from '@nestjs/common';
import { PLATFORM_SETTING_MODEL } from '../../database/database.constants.js';
import { PlatformSetting } from '../../database/models/index.js';

const SINGLETON_ID = 1;

@Injectable()
export class PlatformSettingsService {
  constructor(
    @Inject(PLATFORM_SETTING_MODEL) private readonly settingModel: typeof PlatformSetting,
  ) {}

  async getSettings(): Promise<PlatformSetting> {
    const [settings] = await this.settingModel.findOrCreate({
      where: { id: SINGLETON_ID },
      defaults: {
        id: SINGLETON_ID,
        employerRegistrationOpen: true,
        autoApproveEmployers: false,
        emailNotificationsEnabled: true,
        resumeParsingEnabled: false,
        resumeParsingProvider: 'anthropic',
      },
    });
    return settings;
  }

  async updateSettings(partial: {
    employerRegistrationOpen?: boolean;
    autoApproveEmployers?: boolean;
    emailNotificationsEnabled?: boolean;
    resumeParsingEnabled?: boolean;
    resumeParsingProvider?: 'anthropic' | 'openai';
  }): Promise<PlatformSetting> {
    const settings = await this.getSettings();
    settings.set(partial);
    await settings.save();
    return settings;
  }
}
