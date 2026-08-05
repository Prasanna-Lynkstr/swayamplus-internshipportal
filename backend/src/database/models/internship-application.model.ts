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
import { Student } from './student.model.js';

export type ApplicationStatus =
  | 'applied'
  | 'shortlisted'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn';

@Table({ tableName: 'internship_applications' })
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

  @Attribute(DataTypes.ENUM('applied', 'shortlisted', 'interviewing', 'offered', 'rejected', 'withdrawn'))
  @NotNull
  @Default('applied')
  declare status: CreationOptional<ApplicationStatus>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
