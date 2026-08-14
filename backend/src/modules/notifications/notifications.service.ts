import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service.js';
import { APP_LOGGER } from '../../common/logging/app-logger.constants.js';
import type { AppLogger } from '../../common/logging/app-logger.types.js';

// Real delivery via any standard SMTP provider (ZeptoMail, SES, Mailgun,
// Postmark, ...) once SMTP_HOST is set — see .env.example. Falls back to a
// console-log stub when unconfigured, same pattern as the OTP dev stub.
// Sending is also gated by the admin-facing "Email notifications" toggle
// (platform_settings.emailNotificationsEnabled) so an operator can kill
// outbound email at runtime without touching env vars or redeploying.
@Injectable()
export class NotificationsService {
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly platformSettingsService: PlatformSettingsService,
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
  ) {
    const host = this.configService.get<string>('SMTP_HOST', '');
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM', '') || 'SWAYAM Plus <no-reply@swayamplus.local>';

    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: this.configService.get<number>('SMTP_PORT', 587),
          secure: this.configService.get<boolean>('SMTP_SECURE', false),
          auth: {
            user: this.configService.get<string>('SMTP_USER', ''),
            pass: this.configService.get<string>('SMTP_PASSWORD', ''),
          },
        })
      : null;
  }

  // Deliberately never rejects — a notification failure must never break the
  // caller's request (an application-status update, an employer decision).
  private async send(to: string, subject: string, text: string): Promise<void> {
    try {
      const { emailNotificationsEnabled } = await this.platformSettingsService.getSettings();

      if (!this.transporter || !emailNotificationsEnabled) {
        const reason = !emailNotificationsEnabled ? 'disabled by admin' : 'SMTP not configured';
        this.logger.log(`[DEV EMAIL — ${reason}] To: ${to} — ${subject}: ${text}`, NotificationsService.name);
        return;
      }

      await this.transporter.sendMail({ from: this.fromAddress, to, subject, text });
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${to}: ${(err as Error).message}`,
        undefined,
        NotificationsService.name,
      );
    }
  }

  notifyApplicationStatusChanged(studentEmail: string, internshipTitle: string, status: string) {
    void this.send(
      studentEmail,
      `Your application for "${internshipTitle}" is now "${status}"`,
      `Your application for "${internshipTitle}" is now "${status}".`,
    );
  }

  notifyEmployerVerificationDecision(employerEmail: string, status: string) {
    void this.send(
      employerEmail,
      `Your employer verification is now "${status}"`,
      `Your employer verification is now "${status}".`,
    );
  }
}
