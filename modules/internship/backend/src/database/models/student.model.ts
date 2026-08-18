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

@Table({ tableName: 'students' })
export class Student extends Model<InferAttributes<Student>, InferCreationAttributes<Student>> {
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
  declare fullName: string | null;

  @Attribute(DataTypes.STRING)
  declare phone: string | null;

  @Attribute(DataTypes.STRING)
  declare collegeName: string | null;

  @Attribute(DataTypes.STRING)
  declare course: string | null;

  @Attribute(DataTypes.INTEGER)
  declare graduationYear: number | null;

  @Attribute(DataTypes.STRING)
  declare city: string | null;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare skills: CreationOptional<string[]>;

  @Attribute(DataTypes.STRING)
  declare resumeUrl: string | null;

  @Attribute(DataTypes.STRING)
  declare linkedinUrl: string | null;

  @Attribute(DataTypes.STRING)
  declare githubUrl: string | null;

  // Link to the student's existing My Skills Plus profile — kept as a plain
  // URL field for now, same as linkedinUrl, not a real integration (see
  // docs/SWAYAM_PLUS_INTEGRATION_SPEC.md OQ-13/14 for the eventual
  // shared-identifier/taxonomy-linkage version of this).
  @Attribute(DataTypes.STRING)
  declare mySkillsPlusUrl: string | null;

  // Profile photo — set via POST /students/me/photo, cleared via DELETE.
  // Same "just a URL, StorageService owns the actual file" shape as
  // resumeUrl above.
  @Attribute(DataTypes.STRING)
  declare photoUrl: string | null;

  // Set once, on first acceptance — never overwritten by a later save, so
  // this stays the actual consent timestamp for compliance purposes, not
  // "whenever they last touched the profile form."
  @Attribute(DataTypes.DATE)
  declare acceptedTermsAt: Date | null;

  // Opt-out visibility for the employer-facing candidate directory and
  // recommended-candidates features — every student is discoverable by
  // default; a student who doesn't want employers finding them before they
  // choose to apply can turn this off from their profile.
  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  @Default(true)
  declare discoverableToEmployers: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
