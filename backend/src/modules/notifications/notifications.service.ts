import { Injectable, Logger } from '@nestjs/common';

// TODO: replace with a real email provider (SES, SMTP, etc.) before this leaves a
// local/dev environment — every send is currently just logged to the console.
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  notifyApplicationStatusChanged(studentEmail: string, internshipTitle: string, status: string) {
    this.logger.log(
      `[DEV EMAIL] To: ${studentEmail} — your application for "${internshipTitle}" is now "${status}".`,
    );
  }

  notifyEmployerVerificationDecision(employerEmail: string, status: string) {
    this.logger.log(
      `[DEV EMAIL] To: ${employerEmail} — your employer verification is now "${status}".`,
    );
  }
}
