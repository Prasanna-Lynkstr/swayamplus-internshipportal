import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Op } from '@sequelize/core';
import { INTEREST_REGISTRATION_MODEL } from '../../database/database.constants.js';
import { InterestRegistration } from '../../database/models/index.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateInterestRegistrationDto } from './dto/create-interest-registration.dto.js';
import { QueryInterestRegistrationsDto } from './dto/query-interest-registrations.dto.js';

@Injectable()
export class InterestRegistrationsService {
  constructor(
    @Inject(INTEREST_REGISTRATION_MODEL)
    private readonly interestRegistrationModel: typeof InterestRegistration,
    private readonly configService: ConfigService,
  ) {}

  create(dto: CreateInterestRegistrationDto): Promise<InterestRegistration> {
    return this.interestRegistrationModel.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone ?? null,
      areaOfInterest: dto.areaOfInterest ?? null,
      notes: dto.notes ?? null,
    });
  }

  async findAll(query: QueryInterestRegistrationsDto) {
    const where: Record<string | symbol, unknown> = {};
    if (query.q) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${query.q}%` } },
        { email: { [Op.iLike]: `%${query.q}%` } },
      ];
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.interestRegistrationModel.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return toPaginatedResult(rows, count, page, pageSize);
  }
}
