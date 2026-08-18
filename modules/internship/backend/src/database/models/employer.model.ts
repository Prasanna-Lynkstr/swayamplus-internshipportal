import { DataTypes, Model } from '@sequelize/core';
import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from '@sequelize/core';
import {
  Attribute,
  AutoIncrement,
  BelongsTo,
  Default,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
} from '@sequelize/core/decorators-legacy';
import { User } from './user.model.js';

export type EmployerVerificationStatus = 'pending' | 'approved' | 'rejected';
export type EmployerModerationMode = 'auto_publish' | 'review';

// EOI-based onboarding: the review itself happens on EmployerEoi (see that
// model) while there's still no account — this row is only ever created by
// EmployerEoiService.convert() once an admin approves, already carrying
// every field the EOI captured (reason for EOI, CIN, Certificate of
// Incorporation, headcount, LinkedIn business page, internship types
// expected) copied straight across.
@Table({ tableName: 'employers' })
export class Employer extends Model<InferAttributes<Employer>, InferCreationAttributes<Employer>> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  @Unique
  declare userId: number;

  @BelongsTo(() => User, 'userId')
  declare user?: NonAttribute<User>;

  @Attribute(DataTypes.STRING)
  declare organizationName: string | null;

  // Who the admin team actually reaches out to for verification/onboarding
  // questions — an org name alone isn't a way to contact anyone.
  @Attribute(DataTypes.STRING)
  declare contactPersonName: string | null;

  @Attribute(DataTypes.STRING)
  declare contactPersonPhone: string | null;

  @Attribute(DataTypes.TEXT)
  declare reasonForEoi: string | null;

  @Attribute(DataTypes.STRING)
  declare cin: string | null;

  @Attribute(DataTypes.STRING)
  declare certificateOfIncorporationUrl: string | null;

  @Attribute(DataTypes.INTEGER)
  declare headcount: number | null;

  @Attribute(DataTypes.STRING)
  declare linkedinBusinessPage: string | null;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare internshipTypesExpected: CreationOptional<string[]>;

  @Attribute(DataTypes.STRING)
  declare website: string | null;

  @Attribute(DataTypes.STRING)
  declare logoUrl: string | null;

  @Attribute(DataTypes.STRING)
  declare hqCity: string | null;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare industryTags: CreationOptional<string[]>;

  // Always 'approved' at creation — an Employer row only ever comes from
  // EmployerEoiService.convert(), which never converts anything but an
  // approved EOI. 'pending'/'rejected' stay valid enum values for a future
  // admin action against an already-approved employer (e.g. suspending one
  // after the fact), not because any code path creates a row in either
  // state today.
  @Attribute(DataTypes.ENUM('pending', 'approved', 'rejected'))
  @NotNull
  @Default('approved')
  declare verificationStatus: CreationOptional<EmployerVerificationStatus>;

  // Admin-set, per-employer: whether this employer's postings go straight to
  // 'published' on publish, or first sit in 'pending_review' for an admin
  // decision. Default matches the platform-wide default (auto-publish).
  @Attribute(DataTypes.ENUM('auto_publish', 'review'))
  @NotNull
  @Default('auto_publish')
  declare moderationMode: CreationOptional<EmployerModerationMode>;

  // Set once, at EOI submission — never overwritten by a later edit, so this
  // stays the actual consent timestamp for compliance purposes.
  @Attribute(DataTypes.DATE)
  declare acceptedTermsAt: Date | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
