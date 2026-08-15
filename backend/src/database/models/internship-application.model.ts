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
import { Internship } from './internship.model.js';
import type { ChecklistItemType } from './internship.model.js';
import { Student } from './student.model.js';

// Matches the product spec's original "limited / moderate / expert" scale
// (§5.2) — a plain checkbox shipped during the Aug 14 refactor was a
// drift/simplification, not a deliberate scope decision; restored here.
export type ChecklistResponseLevel = 'limited' | 'moderate' | 'expert';

// A student answers a 'yesno' checklist item (see Internship.checklistItems)
// with a plain confirmation rather than a skill-level rating.
export type ChecklistAnswer = 'yes' | 'no';

export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn';

@Table({
  tableName: 'internship_applications',
  indexes: [{ fields: ['status'] }],
})
export class InternshipApplication extends Model<
  InferAttributes<InternshipApplication>,
  InferCreationAttributes<InternshipApplication>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  @Unique('internship_student')
  declare internshipId: number;

  @BelongsTo(() => Internship, 'internshipId')
  declare internship?: NonAttribute<Internship>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  @Unique('internship_student')
  declare studentId: number;

  @BelongsTo(() => Student, 'studentId')
  declare student?: NonAttribute<Student>;

  @Attribute(DataTypes.TEXT)
  declare coverNote: string | null;

  // Student's response against the employer's checklist at apply time — e.g.
  // [{ item: 'Comfortable with React', type: 'rating', value: 'moderate',
  // note: 'Used it in one course project' }, { item: 'Can work 6 days a
  // week', type: 'yesno', value: 'yes' }, ...]. `type` is snapshotted
  // alongside the answer (not re-derived from the live Internship row) so a
  // response still renders correctly even if the employer edits or removes
  // that checklist item later. `note` is optional free text — lets a
  // student explain *why* they answered that way, materially more useful to
  // an employer than a bare value.
  @Attribute(DataTypes.JSONB)
  @Default([])
  declare checklistResponses: CreationOptional<
    Array<{
      item: string;
      type: ChecklistItemType;
      value: ChecklistResponseLevel | ChecklistAnswer;
      note?: string | null;
    }>
  >;

  @Attribute(DataTypes.ENUM('applied', 'shortlisted', 'interviewing', 'offered', 'rejected', 'withdrawn'))
  @NotNull
  @Default('applied')
  declare status: CreationOptional<ApplicationStatus>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
