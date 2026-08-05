import { DataTypes, Model } from '@sequelize/core';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from '@sequelize/core';
import {
  Attribute,
  AutoIncrement,
  Default,
  NotNull,
  PrimaryKey,
  Table,
} from '@sequelize/core/decorators-legacy';

@Table({
  tableName: 'otp_codes',
  indexes: [{ fields: ['identifier'] }],
})
export class OtpCode extends Model<InferAttributes<OtpCode>, InferCreationAttributes<OtpCode>> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare identifier: string;

  @Attribute(DataTypes.ENUM('student', 'employer'))
  @NotNull
  declare role: 'student' | 'employer';

  @Attribute(DataTypes.STRING)
  @NotNull
  declare codeHash: string;

  @Attribute(DataTypes.DATE)
  @NotNull
  declare expiresAt: Date;

  @Attribute(DataTypes.DATE)
  declare consumedAt: Date | null;

  @Attribute(DataTypes.INTEGER)
  @Default(0)
  declare attempts: CreationOptional<number>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
