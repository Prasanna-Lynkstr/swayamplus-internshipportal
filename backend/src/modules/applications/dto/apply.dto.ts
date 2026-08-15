import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import type {
  ChecklistAnswer,
  ChecklistItemType,
  ChecklistResponseLevel,
} from '../../../database/models/index.js';

const CHECKLIST_ITEM_TYPES: ChecklistItemType[] = ['rating', 'yesno'];
// Union of every value either checklist-item type can produce — a 'rating'
// item is answered with a level, a 'yesno' item with an answer. Not
// cross-validated against `type` here (e.g. a 'yesno' item answered
// 'expert'): the value is a self-reported opinion, not something an
// inconsistency could corrupt, so the simpler flat @IsIn is enough.
const CHECKLIST_RESPONSE_VALUES: Array<ChecklistResponseLevel | ChecklistAnswer> = [
  'limited',
  'moderate',
  'expert',
  'yes',
  'no',
];

class ChecklistResponseDto {
  @IsString()
  item!: string;

  @IsIn(CHECKLIST_ITEM_TYPES)
  type!: ChecklistItemType;

  @IsIn(CHECKLIST_RESPONSE_VALUES)
  value!: ChecklistResponseLevel | ChecklistAnswer;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ApplyDto {
  @IsOptional()
  @IsString()
  coverNote?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistResponseDto)
  checklistResponses?: ChecklistResponseDto[];
}
