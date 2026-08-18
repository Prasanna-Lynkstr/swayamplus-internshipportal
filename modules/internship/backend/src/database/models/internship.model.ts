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
import { Employer } from './employer.model.js';

// category/mode/employmentType/scheduleType are admin-managed content
// taxonomies (see common/constants/taxonomies.ts + TaxonomiesService) — plain
// strings validated against `taxonomy_values` at the app layer, not DB enums.
// `status` stays a real Postgres ENUM: it's a workflow state machine the code
// branches on (visibility rules, publish/close transitions), not a taxonomy.
// `pending_review` sits between draft and published — only reachable when the
// owning employer's moderationMode is 'review' (see Employer.moderationMode).
export type InternshipStatus = 'draft' | 'pending_review' | 'published' | 'closed' | 'archived';

// educationLevel/stream are code-level enums (not admin-managed taxonomies —
// unlike category/mode/etc., these were scoped out of Phase 0's taxonomy
// work, see docs/V1_RELEASE_SPEC.md §14). Nullable: existing postings
// predate these fields and have no safe default to backfill; new postings
// are required to set them (see CreateInternshipDto). 'Any' is a real,
// explicit value (not the same as null/unset) meaning the employer
// deliberately doesn't care about this axis — InternshipsService.findPublished
// matches it against every education-level/stream filter a student picks.
export type ChecklistItemType = 'rating' | 'yesno';

export type EducationLevel = 'UG' | 'PG' | 'Other' | 'Any';
export type Stream =
  | 'Engineering'
  | 'Management'
  | 'Arts'
  | 'Commerce'
  | 'Science'
  | 'Law'
  | 'Medical'
  | 'Other'
  | 'Any';

@Table({
  tableName: 'internships',
  indexes: [{ fields: ['status', 'category', 'mode'] }],
})
export class Internship extends Model<
  InferAttributes<Internship>,
  InferCreationAttributes<Internship>
> {
  @Attribute(DataTypes.INTEGER)
  @PrimaryKey
  @AutoIncrement
  declare id: CreationOptional<number>;

  // The only identifier ever exposed to a client (see
  // InternshipsService/serialize-internship.util.ts) — the numeric `id`
  // above is purely an internal PK for FK joins (internship_applications
  // etc.) and must never appear in a response. Existing rows are backfilled
  // by scripts/migrate-internship-uuid.ts; new rows get one client-side via
  // this default.
  @Attribute(DataTypes.UUID)
  @NotNull
  @Unique
  @Default(DataTypes.UUIDV4)
  declare uuid: CreationOptional<string>;

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
  declare category: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  declare mode: string;

  @Attribute(DataTypes.STRING)
  @NotNull
  @Default('full-time')
  declare employmentType: CreationOptional<string>;

  @Attribute(DataTypes.STRING)
  declare location: string | null;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  declare durationWeeks: number;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  @Default(5)
  declare workingDays: CreationOptional<number>;

  @Attribute(DataTypes.STRING)
  @NotNull
  @Default('flexible')
  declare scheduleType: CreationOptional<string>;

  @Attribute(DataTypes.INTEGER)
  declare stipendMin: number | null;

  @Attribute(DataTypes.INTEGER)
  declare stipendMax: number | null;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare responsibilities: CreationOptional<string[]>;

  @Attribute(DataTypes.JSONB)
  @Default([])
  declare perks: CreationOptional<string[]>;

  // Supplementary freeform eligibility notes (e.g. "Must be based in
  // Chennai") — structured eligibility criteria live in educationLevel/
  // stream/experienceRequired below; this stays for nuance those three axes
  // don't capture.
  @Attribute(DataTypes.JSONB)
  @Default([])
  declare eligibility: CreationOptional<string[]>;

  @Attribute(DataTypes.ENUM('UG', 'PG', 'Other', 'Any'))
  declare educationLevel: EducationLevel | null;

  @Attribute(
    DataTypes.ENUM(
      'Engineering',
      'Management',
      'Arts',
      'Commerce',
      'Science',
      'Law',
      'Medical',
      'Other',
      'Any',
    ),
  )
  declare stream: Stream | null;

  @Attribute(DataTypes.BOOLEAN)
  @NotNull
  @Default(false)
  declare experienceRequired: CreationOptional<boolean>;

  // AI-generated applicant checklist — LLM-derived from the description (see
  // modules/checklist/), employer-editable before/after generation. Each
  // item is either a self-rating question ('rating' — student answers
  // limited/moderate/expert) or a plain confirmation question ('yesno' —
  // e.g. "Can you commit to 6 days a week?", which doesn't fit a skill-level
  // scale). The generator only produces item text; the employer assigns
  // each item's type when reviewing the generated (or hand-written) list.
  @Attribute(DataTypes.JSONB)
  @Default([])
  declare checklistItems: CreationOptional<Array<{ item: string; type: ChecklistItemType }>>;

  @Attribute(DataTypes.INTEGER)
  @NotNull
  @Default(1)
  declare openings: CreationOptional<number>;

  @Attribute(DataTypes.DATE)
  @NotNull
  declare applicationDeadline: Date;

  @Attribute(DataTypes.ENUM('draft', 'pending_review', 'published', 'closed', 'archived'))
  @NotNull
  @Default('draft')
  declare status: CreationOptional<InternshipStatus>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
