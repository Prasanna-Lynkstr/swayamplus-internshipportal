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
} from '@sequelize/core/decorators-legacy';
import { Employer } from './employer.model.js';

export type InternshipMode = 'remote' | 'onsite' | 'hybrid';
export type InternshipStatus = 'draft' | 'published' | 'closed' | 'archived';

@Table({ tableName: 'internships' })
export class Internship extends Model<
  InferAttributes<Internship>,
  InferCreationAttributes<Internship>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare employerId: number;

  @BelongsTo(() => Employer, 'employerId')
  declare employer?: NonAttribute<Employer>;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare title: string;

  @Attribute(DataTypes.TEXT)
  @NotNull
  declare description: string;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare skillTags: CreationOptional<string[]>;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare domain: string;

  @Attribute(DataTypes.ENUM('remote', 'onsite', 'hybrid'))
  @NotNull
  declare mode: InternshipMode;

  @Attribute(DataTypes.STRING)
  declare location: string | null;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare durationWeeks: number;

  @Attribute(DataTypes.INTEGER)
  declare stipendMin: number | null;

  @Attribute(DataTypes.INTEGER)
  declare stipendMax: number | null;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  @Default(1)
  declare openings: CreationOptional<number>;

  @Attribute(DataTypes.DATE)
  @NotNull
  declare applicationDeadline: Date;

  @Attribute(DataTypes.ENUM('draft', 'published', 'closed', 'archived'))
  @NotNull
  @Default('draft')
  declare status: CreationOptional<InternshipStatus>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
