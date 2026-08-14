import { Global, Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { sequelizeProvider } from './sequelize.provider.js';
import { DatabaseShutdownService } from './database-shutdown.service.js';
import {
  APPLICATION_NOTE_MODEL,
  EMPLOYER_MODEL,
  INTEREST_REGISTRATION_MODEL,
  INTERNSHIP_APPLICATION_MODEL,
  INTERNSHIP_MODEL,
  INTERNSHIP_REQUEST_MODEL,
  OTP_CODE_MODEL,
  PLATFORM_SETTING_MODEL,
  SEQUELIZE,
  STUDENT_MODEL,
  STUDENT_PREFERENCE_MODEL,
  USER_MODEL,
} from './database.constants.js';
import {
  ApplicationNote,
  Employer,
  InterestRegistration,
  Internship,
  InternshipApplication,
  InternshipRequest,
  OtpCode,
  PlatformSetting,
  Student,
  StudentPreference,
  User,
} from './models/index.js';

// Each model provider depends on SEQUELIZE, which forces Nest to finish connecting +
// `addModels`/`sync` before any model class is handed to a service — the model class
// itself is returned as-is since decorators bind its static query methods in place.
function modelProvider(token: string, model: unknown): Provider {
  return {
    provide: token,
    inject: [SEQUELIZE],
    useFactory: () => model,
  };
}

@Global()
@Module({
  providers: [
    sequelizeProvider,
    DatabaseShutdownService,
    modelProvider(USER_MODEL, User),
    modelProvider(OTP_CODE_MODEL, OtpCode),
    modelProvider(STUDENT_MODEL, Student),
    modelProvider(STUDENT_PREFERENCE_MODEL, StudentPreference),
    modelProvider(EMPLOYER_MODEL, Employer),
    modelProvider(PLATFORM_SETTING_MODEL, PlatformSetting),
    modelProvider(INTERNSHIP_MODEL, Internship),
    modelProvider(INTERNSHIP_APPLICATION_MODEL, InternshipApplication),
    modelProvider(APPLICATION_NOTE_MODEL, ApplicationNote),
    modelProvider(INTERNSHIP_REQUEST_MODEL, InternshipRequest),
    modelProvider(INTEREST_REGISTRATION_MODEL, InterestRegistration),
  ],
  exports: [
    SEQUELIZE,
    USER_MODEL,
    OTP_CODE_MODEL,
    STUDENT_MODEL,
    STUDENT_PREFERENCE_MODEL,
    EMPLOYER_MODEL,
    PLATFORM_SETTING_MODEL,
    INTERNSHIP_MODEL,
    INTERNSHIP_APPLICATION_MODEL,
    APPLICATION_NOTE_MODEL,
    INTERNSHIP_REQUEST_MODEL,
    INTEREST_REGISTRATION_MODEL,
  ],
})
export class DatabaseModule {}
