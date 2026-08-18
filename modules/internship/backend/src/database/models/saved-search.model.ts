import { DataTypes, Model } from '@sequelize/core';
import type { CreationOptional, InferAttributes, InferCreationAttributes, NonAttribute } from '@sequelize/core';
import {
  Attribute,
  AutoIncrement,
  BelongsTo,
  Default,
  NotNull,
  PrimaryKey,
  Table,
} from '@sequelize/core/decorators-legacy';
import { Student } from './student.model.js';

// A student's saved browse-filter combination — no user-editable label.
// Deriving a display summary from `filters` at render time (the frontend
// already has the taxonomy label maps it needs for this) avoids a stored
// label ever drifting from what a category/taxonomy value is actually
// called if an admin renames one later.
@Table({
  tableName: 'saved_searches',
  indexes: [{ fields: ['studentId'] }],
})
export class SavedSearch extends Model<InferAttributes<SavedSearch>, InferCreationAttributes<SavedSearch>> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare studentId: number;

  @BelongsTo(() => Student, 'studentId')
  declare student?: NonAttribute<Student>;

  // Allowlist-filtered by SavedSearchesService.create before it ever
  // reaches here — never store a client-supplied key/value verbatim.
  @Attribute(DataTypes.JSONB)
  @Default({})
  declare filters: CreationOptional<Record<string, string>>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
