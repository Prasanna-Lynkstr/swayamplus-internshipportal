import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Op } from '@sequelize/core';
import { EMPLOYER_MODEL, INTERNSHIP_MODEL } from '../../database/database.constants.js';
import { Employer, Internship } from '../../database/models/index.js';
import { CreateInternshipDto } from './dto/create-internship.dto.js';
import { UpdateInternshipDto } from './dto/update-internship.dto.js';
import { QueryInternshipsDto } from './dto/query-internships.dto.js';

@Injectable()
export class InternshipsService {
  constructor(
    @Inject(INTERNSHIP_MODEL) private readonly internshipModel: typeof Internship,
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
  ) {}

  private async getApprovedEmployer(userId: number): Promise<Employer> {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    if (employer.verificationStatus !== 'approved') {
      throw new ForbiddenException('Only verified employers can manage internships.');
    }
    return employer;
  }

  async create(userId: number, dto: CreateInternshipDto): Promise<Internship> {
    const employer = await this.getApprovedEmployer(userId);
    return this.internshipModel.create({
      employerId: employer.id,
      title: dto.title,
      description: dto.description,
      skillTags: dto.skillTags ?? [],
      domain: dto.domain,
      mode: dto.mode,
      location: dto.location ?? null,
      durationWeeks: dto.durationWeeks,
      stipendMin: dto.stipendMin ?? null,
      stipendMax: dto.stipendMax ?? null,
      openings: dto.openings ?? 1,
      applicationDeadline: new Date(dto.applicationDeadline),
      status: 'draft',
    });
  }

  async findPublished(query: QueryInternshipsDto) {
    const where: Record<string | symbol, unknown> = { status: 'published' };
    if (query.location) where.location = { [Op.iLike]: `%${query.location}%` };
    if (query.domain) where.domain = { [Op.iLike]: `%${query.domain}%` };
    if (query.mode) where.mode = query.mode;
    if (query.q) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${query.q}%` } },
        { description: { [Op.iLike]: `%${query.q}%` } },
      ];
    }
    return this.internshipModel.findAll({
      where,
      include: [{ model: this.employerModel, as: 'employer' }],
      order: [['createdAt', 'DESC']],
    });
  }

  async findMine(userId: number) {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    return this.internshipModel.findAll({
      where: { employerId: employer.id },
      order: [['createdAt', 'DESC']],
    });
  }

  async findOne(id: number): Promise<Internship> {
    const internship = await this.internshipModel.findByPk(id, {
      include: [{ model: this.employerModel, as: 'employer' }],
    });
    if (!internship) {
      throw new NotFoundException('Internship not found.');
    }
    return internship;
  }

  private async findOwned(id: number, userId: number): Promise<Internship> {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    const internship = await this.internshipModel.findByPk(id);
    if (!internship || internship.employerId !== employer.id) {
      throw new NotFoundException('Internship not found.');
    }
    return internship;
  }

  async update(id: number, userId: number, dto: UpdateInternshipDto): Promise<Internship> {
    const internship = await this.findOwned(id, userId);
    const { applicationDeadline, ...rest } = dto;
    internship.set(rest);
    if (applicationDeadline) {
      internship.applicationDeadline = new Date(applicationDeadline);
    }
    await internship.save();
    return internship;
  }

  async publish(id: number, userId: number): Promise<Internship> {
    const internship = await this.findOwned(id, userId);
    internship.status = 'published';
    await internship.save();
    return internship;
  }

  async close(id: number, userId: number): Promise<Internship> {
    const internship = await this.findOwned(id, userId);
    internship.status = 'closed';
    await internship.save();
    return internship;
  }

  async assertOwnedByUser(internshipId: number, userId: number): Promise<Internship> {
    return this.findOwned(internshipId, userId);
  }
}
