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
import { toCsv } from '../../common/utils/csv.util.js';
import { CreateInternshipRequestDto } from './dto/create-internship-request.dto.js';
import { QueryInternshipRequestsDto } from './dto/query-internship-requests.dto.js';

const EXPORT_COLUMNS = [
  { key: 'email', label: 'Student email' },
  { key: 'fullName', label: 'Student name' },
  { key: 'domain', label: 'Domain requested' },
  { key: 'notes', label: 'Notes' },
  { key: 'createdAt', label: 'Requested on' },
];

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

  private baseWhere(query: QueryInternshipRequestsDto): Record<string | symbol, unknown> {
    const where: Record<string | symbol, unknown> = {};
    if (query.q) {
      where[Op.or] = [
        { domain: { [Op.iLike]: `%${query.q}%` } },
        sqlWhere(col('student.user.identifier'), { [Op.iLike]: `%${query.q}%` }),
      ];
    }
    return where;
  }

  async findAll(query: QueryInternshipRequestsDto) {
    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.internshipRequestModel.findAndCountAll({
      where: this.baseWhere(query),
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

  // Full matching set, no pagination — leads for a marketing manager to
  // pull into Mailchimp (students who couldn't find a suitable listing are
  // arguably the highest-intent segment for a "we just added X" campaign).
  async exportAll(query: QueryInternshipRequestsDto): Promise<string> {
    const rows = await this.internshipRequestModel.findAll({
      where: this.baseWhere(query),
      include: [
        {
          model: this.studentModel,
          as: 'student',
          include: [{ model: this.userModel, as: 'user', ...USER_SAFE_ATTRIBUTES }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    const csvRows = rows.map((r) => ({
      email: r.student?.user?.identifier ?? '',
      fullName: r.student?.fullName ?? '',
      domain: r.domain,
      notes: r.notes ?? '',
      createdAt: r.createdAt.toISOString(),
    }));
    return toCsv(csvRows, EXPORT_COLUMNS);
  }
}
