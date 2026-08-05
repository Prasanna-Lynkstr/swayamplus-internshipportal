import { DataTypes, Model } from '@sequelize/core';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from '@sequelize/core';
import { Attribute, Default, NotNull, PrimaryKey, Table } from '@sequelize/core/decorators-legacy';

// Singleton table — always exactly one row, id=1. Seeded/upserted lazily by AdminService.
@Table({ tableName: 'platform_settings' })
export class PlatformSetting extends Model<
  InferAttributes<PlatformSetting>,
  InferCreationAttributes<PlatformSetting>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  @Default(true)
  declare employerRegistrationOpen: CreationOptional<boolean>;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  @Default(false)
  declare autoApproveEmployers: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
