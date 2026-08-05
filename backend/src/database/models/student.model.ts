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

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
