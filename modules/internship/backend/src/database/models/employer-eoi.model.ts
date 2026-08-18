import { DataTypes, Model } from '@sequelize/core';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from '@sequelize/core';
import { Attribute, AutoIncrement, Default, NotNull, PrimaryKey, Table } from '@sequelize/core/decorators-legacy';

export type EmployerEoiStatus = 'pending' | 'approved' | 'rejected';

// A public, no-account Expression of Interest — the *only* path to a new
// employer account now (see AuthService.verifyOtp, which no longer
// auto-creates an employer on first OTP verify). Deliberately its own table
// rather than an Employer row with a nullable userId: Employer.userId is
// NOT NULL + UNIQUE today, and every existing service that touches an
// Employer assumes a real user is behind it (notifications, ownership
// checks, the admin employer list) — this stays fully decoupled until
// EmployerEoiService.decide() converts an approved row into a real
// User + Employer pair.
@Table({
  tableName: 'employer_eois',
  indexes: [{ fields: ['email'] }, { fields: ['status'] }],
})
export class EmployerEoi extends Model<InferAttributes<EmployerEoi>, InferCreationAttributes<EmployerEoi>> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  // The future login identifier — no User row exists yet, so this is a
  // plain string here, not a relation. Admin-editable pre-approval if it
  // collides with an existing employer account (see decide()).
  @Attribute(DataTypes.STRING)
  @NotNull
  declare email: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare organizationName: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare contactPersonName: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare contactPersonPhone: string;

  @Attribute(DataTypes.TEXT)
  @NotNull
  declare reasonForEoi: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare cin: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare certificateOfIncorporationUrl: string;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare headcount: number;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare linkedinBusinessPage: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare website: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare hqCity: string;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare internshipTypesExpected: CreationOptional<string[]>;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare industryTags: CreationOptional<string[]>;

  @Attribute(DataTypes.DATE)
  @NotNull
  declare acceptedTermsAt: Date;

  // Multer sees the real submitter IP even behind nginx's proxy_pass (see
  // deploy/nginx/swayamplus.conf's X-Forwarded-For) — best-effort, feeds the
  // per-IP throttle in EmployerEoiService.create() alongside the per-email one.
  @Attribute(DataTypes.STRING)
  declare submittedIp: string | null;

  @Attribute(DataTypes.ENUM('pending', 'approved', 'rejected'))
  @NotNull
  @Default('pending')
  declare status: CreationOptional<EmployerEoiStatus>;

  @Attribute(DataTypes.DATE)
  declare decidedAt: Date | null;

  @Attribute(DataTypes.INTEGER)
  declare decidedByAdminUserId: number | null;

  // Set once conversion succeeds — lets the admin screen show "already
  // converted, see Employer #N" and blocks re-approving the same row twice.
  @Attribute(DataTypes.INTEGER)
  declare convertedEmployerId: number | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
