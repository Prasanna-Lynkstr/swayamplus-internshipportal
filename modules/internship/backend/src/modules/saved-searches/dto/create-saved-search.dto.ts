import { IsObject } from 'class-validator';

// Deliberately loose here — SavedSearchesService.create allowlist-filters
// this down to known browse-filter keys and coerces each surviving value to
// a string before it ever reaches the database, so no key/value shape needs
// validating at the DTO layer.
export class CreateSavedSearchDto {
  @IsObject()
  filters!: Record<string, unknown>;
}
