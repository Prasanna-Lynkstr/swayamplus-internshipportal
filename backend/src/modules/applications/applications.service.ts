import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  APPLICATION_NOTE_MODEL,
  EMPLOYER_MODEL,
  INTERNSHIP_APPLICATION_MODEL,
  INTERNSHIP_MODEL,
  STUDENT_MODEL,
  USER_MODEL,
} from '../../database/database.constants.js';
import {
  ApplicationNote,
  Employer,
  Internship,
  InternshipApplication,
  Student,
  User,
} from '../../database/models/index.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { resolvePagination, toPaginatedResult } from '../../common/utils/pagination.util.js';
import { isStudentProfileComplete } from '../../common/utils/student-profile.util.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { ApplyDto } from './dto/apply.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';
import { AddApplicationNoteDto } from './dto/add-application-note.dto.js';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(INTERNSHIP_APPLICATION_MODEL)
    private readonly applicationModel: typeof InternshipApplication,
    @Inject(INTERNSHIP_MODEL) private readonly internshipModel: typeof Internship,
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
    @Inject(APPLICATION_NOTE_MODEL) private readonly applicationNoteModel: typeof ApplicationNote,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  private async getStudent(userId: number): Promise<Student> {
    const student = await this.studentModel.findOne({ where: { userId } });
    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }
    return student;
  }

  private async getEmployer(userId: number): Promise<Employer> {
    const employer = await this.employerModel.findOne({ where: { userId } });
    if (!employer) {
      throw new NotFoundException('Employer profile not found.');
    }
    return employer;
  }

  async apply(userId: number, internshipId: number, dto: ApplyDto): Promise<InternshipApplication> {
    const student = await this.getStudent(userId);
    if (!isStudentProfileComplete(student)) {
      throw new ForbiddenException(
        'Please complete your profile (name, phone, college, course, graduation year, city, resume, and at least one skill) before applying.',
      );
    }

    const internship = await this.internshipModel.findByPk(internshipId);
    if (!internship || internship.status !== 'published') {
      throw new NotFoundException('Internship not found or not accepting applications.');
    }

    const existing = await this.applicationModel.findOne({
      where: { internshipId, studentId: student.id },
    });
    if (existing) {
      throw new ConflictException('You have already applied to this internship.');
    }

    return this.applicationModel.create({
      internshipId,
      studentId: student.id,
      coverNote: dto.coverNote ?? null,
      checklistResponses: dto.checklistResponses ?? [],
      status: 'applied',
    });
  }

  async findMyApplicationForInternship(
    userId: number,
    internshipId: number,
  ): Promise<InternshipApplication | null> {
    const student = await this.studentModel.findOne({ where: { userId } });
    if (!student) return null;
    return this.applicationModel.findOne({ where: { internshipId, studentId: student.id } });
  }

  async findMine(userId: number, query: PaginationQueryDto) {
    const student = await this.getStudent(userId);
    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.applicationModel.findAndCountAll({
      where: { studentId: student.id },
      include: [{ model: this.internshipModel, as: 'internship' }],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return toPaginatedResult(rows, count, page, pageSize);
  }

  async withdraw(applicationId: number, userId: number): Promise<InternshipApplication> {
    const student = await this.getStudent(userId);
    const application = await this.applicationModel.findByPk(applicationId);
    if (!application || application.studentId !== student.id) {
      throw new NotFoundException('Application not found.');
    }
    application.status = 'withdrawn';
    await application.save();
    return application;
  }

  async findForInternship(internshipId: number, userId: number, query: PaginationQueryDto) {
    const employer = await this.getEmployer(userId);
    const internship = await this.internshipModel.findByPk(internshipId);
    if (!internship || internship.employerId !== employer.id) {
      throw new NotFoundException('Internship not found.');
    }

    const { page, pageSize, offset } = resolvePagination(this.configService, query);

    const { rows, count } = await this.applicationModel.findAndCountAll({
      where: { internshipId },
      include: [{ model: this.studentModel, as: 'student' }],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    return toPaginatedResult(rows, count, page, pageSize);
  }

  async updateStatus(
    applicationId: number,
    userId: number,
    dto: UpdateApplicationStatusDto,
  ): Promise<InternshipApplication> {
    const employer = await this.getEmployer(userId);
    const application = await this.applicationModel.findByPk(applicationId, {
      include: [
        { model: this.internshipModel, as: 'internship' },
        { model: this.studentModel, as: 'student' },
      ],
    });
    if (!application || application.internship?.employerId !== employer.id) {
      throw new NotFoundException('Application not found.');
    }
    if (application.status === 'withdrawn') {
      throw new ForbiddenException('This application has been withdrawn by the student.');
    }

    application.status = dto.status;
    await application.save();

    const studentUser = application.student
      ? await this.userModel.findByPk(application.student.userId)
      : null;
    if (studentUser) {
      this.notificationsService.notifyApplicationStatusChanged(
        studentUser.identifier,
        application.internship?.title ?? 'your internship',
        dto.status,
      );
    }

    return application;
  }

  // Employers may only see/annotate applications to their own listings; admins
  // may act on any application. Shared by both note endpoints below.
  private async getApplicationForNotes(
    applicationId: number,
    user: AuthenticatedUser,
  ): Promise<InternshipApplication> {
    const application = await this.applicationModel.findByPk(applicationId, {
      include: [{ model: this.internshipModel, as: 'internship' }],
    });
    if (!application) {
      throw new NotFoundException('Application not found.');
    }
    if (user.role === 'employer') {
      const employer = await this.getEmployer(user.sub);
      if (application.internship?.employerId !== employer.id) {
        throw new NotFoundException('Application not found.');
      }
    }
    return application;
  }

  async addNote(
    applicationId: number,
    user: AuthenticatedUser,
    dto: AddApplicationNoteDto,
  ): Promise<ApplicationNote> {
    await this.getApplicationForNotes(applicationId, user);
    return this.applicationNoteModel.create({
      applicationId,
      authorUserId: user.sub,
      note: dto.note,
    });
  }

  async listNotes(applicationId: number, user: AuthenticatedUser): Promise<ApplicationNote[]> {
    await this.getApplicationForNotes(applicationId, user);
    return this.applicationNoteModel.findAll({
      where: { applicationId },
      include: [
        { model: this.userModel, as: 'author', attributes: { exclude: ['passwordHash'] } },
      ],
      order: [['createdAt', 'ASC']],
    });
  }
}
