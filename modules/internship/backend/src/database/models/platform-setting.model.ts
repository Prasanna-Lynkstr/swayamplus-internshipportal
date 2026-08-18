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

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  @Default(true)
  declare emailNotificationsEnabled: CreationOptional<boolean>;

  // Off by default — sending a student's resume text to a third-party LLM
  // is a deliberate opt-in, not a silent default, on a government-affiliated
  // platform. When false, POST /students/me/resume/parse extracts and saves
  // the file but skips field extraction entirely (student fills in the next
  // step by hand) — no heuristic fallback either, per this being an explicit
  // admin choice rather than a transient provider failure.
  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  @Default(false)
  declare resumeParsingEnabled: CreationOptional<boolean>;

  @Attribute(DataTypes.ENUM('anthropic', 'openai'))
  @NotNull
  @Default('anthropic')
  declare resumeParsingProvider: CreationOptional<'anthropic' | 'openai'>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
