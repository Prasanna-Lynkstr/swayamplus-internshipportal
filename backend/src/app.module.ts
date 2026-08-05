import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { EmployersModule } from './modules/employers/employers.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { PlatformSettingsModule } from './modules/platform-settings/platform-settings.module.js';
import { InternshipsModule } from './modules/internships/internships.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { InternshipRequestsModule } from './modules/internship-requests/internship-requests.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    StorageModule,
    PlatformSettingsModule,
    NotificationsModule,
    AuthModule,
    StudentsModule,
    EmployersModule,
    AdminModule,
    InternshipsModule,
    ApplicationsModule,
    InternshipRequestsModule,
  ],
})
export class AppModule {}
