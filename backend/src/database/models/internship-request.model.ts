import { DataTypes, Model } from '@sequelize/core';
import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from '@sequelize/core';
import {
  Attribute,
  AutoIncrement,
  BelongsTo,
  NotNull,
  PrimaryKey,
  Table,
} from '@sequelize/core/decorators-legacy';
import { Student } from './student.model.js';

// Logs demand signals from students who didn't find a suitable listing — read-only
// for admins, no workflow/status attached (see InternshipRequestsService).
@Table({ tableName: 'internship_requests' })
export class InternshipRequest extends Model<
  InferAttributes<InternshipRequest>,
  InferCreationAttributes<InternshipRequest>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare studentId: number;

  @BelongsTo(() => Student, 'studentId')
  declare student?: NonAttribute<Student>;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare domain: string;

  @Attribute(DataTypes.TEXT)
  declare notes: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
