import { Inject, Injectable, Logger, HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Op } from '@sequelize/core';
import {
  EMPLOYER_MODEL,
  OTP_CODE_MODEL,
  STUDENT_MODEL,
  USER_MODEL,
} from '../../database/database.constants.js';
import { Employer, OtpCode, Student, User } from '../../database/models/index.js';

const OTP_TTL_MINUTES = 10;
const OTP_REQUEST_LIMIT = 5;
const OTP_VERIFY_ATTEMPT_LIMIT = 5;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Swap boundary: everything OTP-specific lives behind requestOtp/verifyOtp.
 * When SWAYAM Plus unifies sign-on across modules, this service (plus the
 * OtpCode model and the two frontend OTP pages) is what gets replaced —
 * JwtAuthGuard/RolesGuard and the { sub, identifier, role } payload shape
 * downstream of this stay the same.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(OTP_CODE_MODEL) private readonly otpCodeModel: typeof OtpCode,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
    @Inject(STUDENT_MODEL) private readonly studentModel: typeof Student,
    @Inject(EMPLOYER_MODEL) private readonly employerModel: typeof Employer,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private isDev(): boolean {
    return this.configService.get<string>('NODE_ENV') !== 'production';
  }

  async requestOtp(identifier: string, role: 'student' | 'employer') {
    const tenMinutesAgo = new Date(Date.now() - OTP_TTL_MINUTES * 60 * 1000);
    const recentCount = await this.otpCodeModel.count({
      where: { identifier, role, createdAt: { [Op.gte]: tenMinutesAgo } },
    });
    if (recentCount >= OTP_REQUEST_LIMIT) {
      throw new HttpException(
        'Too many OTP requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const otp = generateOtp();
    const codeHash = await Bun.password.hash(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.otpCodeModel.create({ identifier, role, codeHash, expiresAt, attempts: 0 });

    // TODO: replace with a real transactional email/SMS provider (SES, SMTP, etc.) before
    // this runs anywhere but a local/dev environment.
    this.logger.log(`[DEV OTP] ${role} ${identifier} -> ${otp} (expires in ${OTP_TTL_MINUTES}m)`);

    return {
      message: 'OTP sent.',
      ...(this.isDev() ? { otp } : {}),
    };
  }

  async verifyOtp(identifier: string, otp: string, role: 'student' | 'employer') {
    const record = await this.otpCodeModel.findOne({
      where: { identifier, role, consumedAt: null },
      order: [['createdAt', 'DESC']],
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }
    if (record.attempts >= OTP_VERIFY_ATTEMPT_LIMIT) {
      throw new UnauthorizedException('Too many incorrect attempts for this OTP.');
    }
    if (record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired OTP.');
    }

    const isMatch = await Bun.password.verify(otp, record.codeHash);
    if (!isMatch) {
      record.attempts += 1;
      await record.save();
      throw new UnauthorizedException('Invalid or expired OTP.');
    }

    record.consumedAt = new Date();
    await record.save();

    let user = await this.userModel.findOne({ where: { identifier, role } });
    if (!user) {
      user = await this.userModel.create({ identifier, role, passwordHash: null, isActive: true });
      if (role === 'student') {
        await this.studentModel.create({ userId: user.id, skills: [] });
      } else {
        await this.employerModel.create({
          userId: user.id,
          industryTags: [],
          verificationStatus: 'pending',
        });
      }
    }

    return this.issueToken(user);
  }

  async adminLogin(email: string, password: string) {
    const user = await this.userModel.findOne({ where: { identifier: email, role: 'admin' } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    const isMatch = await Bun.password.verify(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    return this.issueToken(user);
  }

  private issueToken(user: User) {
    const payload = { sub: user.id, identifier: user.identifier, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: payload,
    };
  }
}
