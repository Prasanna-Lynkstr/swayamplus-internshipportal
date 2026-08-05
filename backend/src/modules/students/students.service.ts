import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { STUDENT_MODEL } from '../../database/database.constants.js';
import { Student } from '../../database/models/index.js';
import { STORAGE_SERVICE } from '../storage/storage.constants.js';
import type { StorageService, UploadableFile } from '../storage/storage.types.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
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
}
