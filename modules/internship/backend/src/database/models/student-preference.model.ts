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

export type AvailabilityStatus = 'actively_looking' | 'not_looking' | 'available_from';

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

  @Attribute(DataTypes.STRING)
  @NotNull
  @Default('either')
  declare paidPreference: CreationOptional<string>;

  // Rupees/month, or null for "no preference" — distinct from paidPreference
  // (paid vs. unpaid) in that this is the floor a listing's stipend needs to
  // clear, same semantics as the browse page's own stipend-floor filter
  // (see FilterSidebar.tsx's STIPEND_PRESETS). Feeds match-score.util.ts.
  @Attribute(DataTypes.INTEGER)
  declare minExpectedStipend: number | null;

  // Free-text job roles/titles of interest (e.g. "Backend Developer") —
  // distinct from preferredCategories, which is the closed taxonomy.
  @Attribute(DataTypes.JSONB)
  @Default([])
  declare rolesOfInterest: CreationOptional<string[]>;

  // Workflow-shaped, not a content taxonomy (the 'available_from' value
  // requires a paired date + range validation — see UpdateStudentPreferencesDto
  // — so this stays a code-level enum, same reasoning as educationLevel/
  // stream on Internship, not an admin-managed taxonomy_values list).
  @Attribute(DataTypes.ENUM('actively_looking', 'not_looking', 'available_from'))
  declare availabilityStatus: AvailabilityStatus | null;

  // Only meaningful when availabilityStatus === 'available_from' — cleared
  // to null otherwise by StudentsService.updatePreferences, so stale future
  // dates don't linger after a student switches back to actively-looking.
  @Attribute(DataTypes.DATEONLY)
  declare availableFrom: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
