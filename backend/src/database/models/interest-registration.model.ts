import { DataTypes, Model } from '@sequelize/core';
import type { CreationOptional, InferAttributes, InferCreationAttributes } from '@sequelize/core';
import { Attribute, AutoIncrement, NotNull, PrimaryKey, Table } from '@sequelize/core/decorators-legacy';

// Day-1 lightweight "Register Interest" capture — deliberately has no FK to
// User/Student. This is meant to be filled in by a brand-new visitor before
// any account exists (unlike InternshipRequest, which logs demand signal from
// an already-registered, already-profiled student — see internship-request.model.ts).
// Read-only for admins, no workflow/status attached, same as InternshipRequest.
@Table({ tableName: 'internship_interest_registrations' })
export class InterestRegistration extends Model<
  InferAttributes<InterestRegistration>,
  InferCreationAttributes<InterestRegistration>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare fullName: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare email: string;

  @Attribute(DataTypes.STRING)
  declare phone: string | null;

  @Attribute(DataTypes.STRING)
  declare areaOfInterest: string | null;

  @Attribute(DataTypes.TEXT)
  declare notes: string | null;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
