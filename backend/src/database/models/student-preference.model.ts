import { DataTypes, Model } from '@sequelize/core';
import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from '@sequelize/core';
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
import { Student } from './student.model.js';

export type PaidPreference = 'paid' | 'unpaid' | 'either';

// First-class preference fields (type/location/mode/FT-PT/paid-unpaid/roles-of-
// interest/availability), kept as their own table rather than columns bolted
// onto `students` — a student profile can exist and be usable (browse, apply)
// with no preferences set at all, so this row is created empty alongside the
// Student row and filled in independently.
@Table({ tableName: 'student_preferences' })
export class StudentPreference extends Model<
  InferAttributes<StudentPreference>,
  InferCreationAttributes<StudentPreference>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  @Unique
  declare studentId: number;

  @BelongsTo(() => Student, 'studentId')
  declare student?: NonAttribute<Student>;

  // "Type" — internship categories the student is interested in (same closed
  // taxonomy as Internship.category).
  @Attribute(DataTypes.JSONB)
  @Default([])
  declare preferredCategories: CreationOptional<string[]>;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare preferredLocations: CreationOptional<string[]>;

  // Modes the student is open to — e.g. ['remote', 'hybrid'], not just one.
  @Attribute(DataTypes.JSONB)
  @Default([])
  declare preferredModes: CreationOptional<string[]>;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare preferredEmploymentTypes: CreationOptional<string[]>;

  @Attribute(DataTypes.ENUM('paid', 'unpaid', 'either'))
  @NotNull
  @Default('either')
  declare paidPreference: CreationOptional<PaidPreference>;

  // Free-text job roles/titles of interest (e.g. "Backend Developer") —
  // distinct from preferredCategories, which is the closed taxonomy.
  @Attribute(DataTypes.JSONB)
  @Default([])
  declare rolesOfInterest: CreationOptional<string[]>;

  // Free text rather than a strict date range — "Immediately",
  // "From June 2026", "Weekends only" all need to fit here.
  @Attribute(DataTypes.STRING)
  declare availability: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
