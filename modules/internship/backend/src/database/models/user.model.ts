import { DataTypes, Model } from '@sequelize/core';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from '@sequelize/core';
import {
  Attribute,
  AutoIncrement,
  Default,
  NotNull,
  PrimaryKey,
  Table,
  Unique,
} from '@sequelize/core/decorators-legacy';

export type UserRole = 'student' | 'employer' | 'admin';

@Table({ tableName: 'users' })
export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.STRING)
  @NotNull
  @Unique('identifier_role')
  declare identifier: string;

  @Attribute(DataTypes.ENUM('student', 'employer', 'admin'))
  @NotNull
  @Unique('identifier_role')
  declare role: UserRole;

  // Admin only — students/employers authenticate via OTP and never set this.
  @Attribute(DataTypes.STRING)
  declare passwordHash: string | null;

  @Attribute(DataTypes.BOOLEAN)
  @Default(true)
  declare isActive: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
