import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { col, fn } from '@sequelize/core';
import {
  INTERNSHIP_APPLICATION_MODEL,
  STUDENT_MODEL,
  STUDENT_PREFERENCE_MODEL,
} from '../../database/database.constants.js';
import { InternshipApplication, Student, StudentPreference } from '../../database/models/index.js';
import type { ApplicationStatus } from '../../database/models/index.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import type { StorageService, UploadableFile } from '../storage/storage.types.js';
import { TaxonomiesService } from '../taxonomies/taxonomies.service.js';
import { ResumeParserService } from './resume-parser.service.js';
import type { ParsedResumeFields } from './resume-parser.types.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { UpdateStudentPreferencesDto } from './dto/update-student-preferences.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(STUDENT_PREFERENCE_MODEL) private readonly studentPreferenceModel: typeof StudentPreference,
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly resumeParserService: ResumeParserService,
  ) {}

  async getByUserId(userId: number): Promise<Student> {
    const student = await this.studentModel.findOne({ where: { userId } });
    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }
    return student;
  }

  async updateByUserId(userId: number, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.getByUserId(userId);
    const { acceptTerms, ...profileFields } = dto;
    student.set(profileFields);
    if (acceptTerms && !student.acceptedTermsAt) {
      student.acceptedTermsAt = new Date();
    }
    await student.save();
    return student;
  }

  async getPreferences(userId: number): Promise<StudentPreference> {
    const student = await this.getByUserId(userId);
    const [preferences] = await this.studentPreferenceModel.findOrCreate({
      where: { studentId: student.id },
    });
    return preferences;
  }

  async updatePreferences(
    userId: number,
    dto: UpdateStudentPreferencesDto,
  ): Promise<StudentPreference> {
    await Promise.all([
      this.taxonomiesService.assertValid('internship_category', dto.preferredCategories),
      this.taxonomiesService.assertValid('work_mode', dto.preferredModes),
      this.taxonomiesService.assertValid('employment_type', dto.preferredEmploymentTypes),
      this.taxonomiesService.assertValid('paid_preference', dto.paidPreference),
    ]);

    const preferences = await this.getPreferences(userId);
    preferences.set(dto);
    // availableFrom only means something for 'available_from' — clear it
    // for the other two statuses so a stale future date can't linger after
    // a student switches back to actively-looking/not-looking.
    if (preferences.availabilityStatus !== 'available_from') {
      preferences.availableFrom = null;
    }
    await preferences.save();
    return preferences;
  }

  async saveResume(userId: number, file: UploadableFile): Promise<Student> {
    const student = await this.getByUserId(userId);
    student.resumeUrl = await this.storageService.save(file, 'resumes');
    await student.save();
    return student;
  }

  // Used only by the upload-first registration step — saves the resume
  // exactly like saveResume above, plus runs best-effort heuristic
  // extraction over it. Kept as its own method (not a flag on saveResume)
  // so a later resume *replacement* from an already-filled-in profile never
  // accidentally re-triggers parsing and overwrites fields the student has
  // since edited by hand.
  async saveResumeAndParse(
    userId: number,
    file: UploadableFile,
  ): Promise<{ student: Student; parsed: ParsedResumeFields }> {
    const student = await this.saveResume(userId, file);
    const parsed = await this.resumeParserService.parse(file.buffer, file.mimeType);
    return { student, parsed };
  }

  async savePhoto(userId: number, file: UploadableFile): Promise<Student> {
    const student = await this.getByUserId(userId);
    const previousPhotoUrl = student.photoUrl;
    student.photoUrl = await this.storageService.save(file, 'photos');
    await student.save();
    // Delete after the new URL is safely persisted, not before — a failed
    // save should never leave a student with neither the old nor new photo.
    if (previousPhotoUrl) {
      await this.storageService.delete(previousPhotoUrl);
    }
    return student;
  }

  async deletePhoto(userId: number): Promise<Student> {
    const student = await this.getByUserId(userId);
    if (student.photoUrl) {
      await this.storageService.delete(student.photoUrl);
      student.photoUrl = null;
      await student.save();
    }
    return student;
  }

  async getDashboardStats(userId: number) {
    const student = await this.getByUserId(userId);

    const rows = await this.applicationModel.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      where: { studentId: student.id },
      group: ['status'],
      raw: true,
    });

    const applications: Record<'total' | ApplicationStatus, number> = {
      total: 0,
      applied: 0,
      shortlisted: 0,
      interviewing: 0,
      offered: 0,
      rejected: 0,
      withdrawn: 0,
    };
    for (const row of rows as unknown as Array<{ status: ApplicationStatus; count: string }>) {
      const count = Number(row.count);
      applications.total += count;
      applications[row.status] = count;
    }

    return { applications };
  }
}
