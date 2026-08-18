import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op, col, where as sqlWhere } from '@sequelize/core';
import {
  INTERNSHIP_REQUEST_MODEL,
  STUDENT_MODEL,
  USER_MODEL,
} from '../../database/database.constants.js';
import { InternshipRequest, Student, User } from '../../database/models/index.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';
import { USER_SAFE_ATTRIBUTES } from '../../common/constants/user-safe-attributes.js';
import { CreateInternshipRequestDto } from './dto/create-internship-request.dto.js';
import { QueryInternshipRequestsDto } from './dto/query-internship-requests.dto.js';

@Injectable()
export class InternshipRequestsService {
  constructor(
    @Inject(INTERNSHIP_REQUEST_MODEL)
    private readonly internshipRequestModel: typeof InternshipRequest,
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
    private readonly configService: ConfigService,
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

  async findAll(query: QueryInternshipRequestsDto) {
    const where: Record<string | symbol, unknown> = {};
    if (query.q) {
      where[Op.or] = [
        { domain: { [Op.iLike]: `%${query.q}%` } },
        sqlWhere(col('student.user.identifier'), { [Op.iLike]: `%${query.q}%` }),
      ];
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.internshipRequestModel.findAndCountAll({
      where,
      include: [
        {
          model: this.studentModel,
          as: 'student',
          include: [{ model: this.userModel, as: 'user', ...USER_SAFE_ATTRIBUTES }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return toPaginatedResult(rows, count, page, pageSize);
  }
}
