import { Inject, Injectable } from '@nestjs/common';
import {
  EMPLOYER_MODEL,
  INTERNSHIP_APPLICATION_MODEL,
  INTERNSHIP_MODEL,
  STUDENT_MODEL,
} from '../../database/database.constants.js';
import { Employer, Internship, InternshipApplication, Student } from '../../database/models/index.js';

export interface PlatformStats {
  studentsRegistered: number;
  employersVerified: number;
  internshipsPosted: number;
  internshipsOffered: number;
}

// A narrow, public subset of what admin.service.ts's getDashboardStats/
// getGrowthInsights already compute — just four coarse counts, no PII and
// no per-entity detail, so it's safe to expose without auth. Feeds the
// employer marketing landing page's "why sign up" trust metrics.
@Injectable()
export class PlatformStatsService {
  constructor(
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(INTERNSHIP_MODEL) private readonly internshipModel: typeof Internship,
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
  ) {}

  async getStats(): Promise<PlatformStats> {
    const [studentsRegistered, employersVerified, internshipsPosted, internshipsOffered] = await Promise.all([
      this.studentModel.count(),
      this.employerModel.count({ where: { verificationStatus: 'approved' } }),
      this.internshipModel.count(),
      this.applicationModel.count({ where: { status: 'offered' } }),
    ]);
    return { studentsRegistered, employersVerified, internshipsPosted, internshipsOffered };
  }
}
