import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  INTERNSHIP_REQUEST_MODEL,
  STUDENT_MODEL,
  USER_MODEL,
} from '../../database/database.constants.js';
import { InternshipRequest, Student, User } from '../../database/models/index.js';
import { CreateInternshipRequestDto } from './dto/create-internship-request.dto.js';

@Injectable()
export class InternshipRequestsService {
  constructor(
    @Inject(INTERNSHIP_REQUEST_MODEL)
    private readonly internshipRequestModel: typeof InternshipRequest,
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
  ) {}

  async create(userId: number, dto: CreateInternshipRequestDto): Promise<InternshipRequest> {
    const student = await this.studentModel.findOne({ where: { userId } });
    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }
    return this.internshipRequestModel.create({
      studentId: student.id,
      domain: dto.domain,
      notes: dto.notes ?? null,
    });
  }

  findAll() {
    return this.internshipRequestModel.findAll({
      include: [
        {
          model: this.studentModel,
          as: 'student',
          include: [{ model: this.userModel, as: 'user' }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }
}
