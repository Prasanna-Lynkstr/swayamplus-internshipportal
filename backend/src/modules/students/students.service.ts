import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { col, fn } from '@sequelize/core';
import { INTERNSHIP_APPLICATION_MODEL, STUDENT_MODEL } from '../../database/database.constants.js';
import { InternshipApplication, Student } from '../../database/models/index.js';
import type { ApplicationStatus } from '../../database/models/index.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import type { StorageService, UploadableFile } from '../storage/storage.types.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
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
    student.set(dto);
    await student.save();
    return student;
  }

  async saveResume(userId: number, file: UploadableFile): Promise<Student> {
    const student = await this.getByUserId(userId);
    student.resumeUrl = await this.storageService.save(file, 'resumes');
    await student.save();
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
