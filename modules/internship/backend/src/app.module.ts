import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation.js';
import { AppLoggerModule } from './common/logging/app-logger.module.js';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { ChecklistModule } from './modules/checklist/checklist.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { EmployersModule } from './modules/employers/employers.module.js';
import { EmployerEoiModule } from './modules/employer-eoi/employer-eoi.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { PlatformSettingsModule } from './modules/platform-settings/platform-settings.module.js';
import { InternshipsModule } from './modules/internships/internships.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { CandidatesModule } from './modules/candidates/candidates.module.js';
import { InternshipRequestsModule } from './modules/internship-requests/internship-requests.module.js';
import { SavedSearchesModule } from './modules/saved-searches/saved-searches.module.js';
import { TaxonomiesModule } from './modules/taxonomies/taxonomies.module.js';
import { PlatformStatsModule } from './modules/platform-stats/platform-stats.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    AppLoggerModule,
    DatabaseModule,
    StorageModule,
    ChecklistModule,
    PlatformSettingsModule,
    NotificationsModule,
    AuthModule,
    StudentsModule,
    EmployersModule,
    EmployerEoiModule,
    AdminModule,
    InternshipsModule,
    ApplicationsModule,
    CandidatesModule,
    InternshipRequestsModule,
    SavedSearchesModule,
    TaxonomiesModule,
    PlatformStatsModule,
    HealthModule,
  ],
})
export class AppModule {}
