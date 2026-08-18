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

// Admin-managed content taxonomies (internship category, work mode, employment
// type, schedule type, paid preference) — deliberately NOT used for workflow
// state machines (user role, verification status, internship/application
// status), where the app branches on the exact string; see
// docs/V1_RELEASE_SPEC.md §14 Phase 0 for the reasoning. Soft-retire via
// isActive rather than deleting — existing rows may still reference a
// retired value.
@Table({
  tableName: 'taxonomy_values',
  indexes: [{ unique: true, fields: ['listKey', 'value'] }],
})
export class TaxonomyValue extends Model<
  InferAttributes<TaxonomyValue>,
  InferCreationAttributes<TaxonomyValue>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare listKey: string;

  // Machine value, stored on the referencing row (e.g. Internship.mode).
  // Immutable after creation — renaming it would silently orphan existing
  // referencing rows; retire and add a new value instead.
  @Attribute(DataTypes.STRING)
  @NotNull
  declare value: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare label: string;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  @Default(0)
  declare sortOrder: CreationOptional<number>;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  @Default(true)
  declare isActive: CreationOptional<boolean>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
