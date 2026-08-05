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

export type EmployerVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

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

  @Attribute(DataTypes.STRING)
  declare cin: string | null;

  @Attribute(DataTypes.STRING)
  declare gst: string | null;

  @Attribute(DataTypes.STRING)
  declare website: string | null;

  @Attribute(DataTypes.STRING)
  declare logoUrl: string | null;

  @Attribute(DataTypes.STRING)
  declare hqCity: string | null;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare industryTags: CreationOptional<string[]>;

  @Attribute(DataTypes.STRING)
  declare verificationDocumentUrl: string | null;

  @Attribute(DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'))
  @NotNull
  @Default('pending')
  declare verificationStatus: CreationOptional<EmployerVerificationStatus>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
