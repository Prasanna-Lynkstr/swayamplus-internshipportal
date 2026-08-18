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
import { InternshipApplication } from './internship-application.model.js';
import { User } from './user.model.js';

// Multi-entry, timestamped notes an employer or admin adds while reviewing an
// application — distinct from `InternshipApplication.coverNote`, which is the
// student's own single note set once at apply time. Append-only: no update or
// delete endpoint, since a review history should stay a history.
@Table({
  tableName: 'application_notes',
  indexes: [{ fields: ['applicationId'] }],
})
export class ApplicationNote extends Model<
  InferAttributes<ApplicationNote>,
  InferCreationAttributes<ApplicationNote>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare applicationId: number;

  @BelongsTo(() => InternshipApplication, 'applicationId')
  declare application?: NonAttribute<InternshipApplication>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare authorUserId: number;

  @BelongsTo(() => User, 'authorUserId')
  declare author?: NonAttribute<User>;

  @Attribute(DataTypes.TEXT)
  @NotNull
  declare note: string;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
