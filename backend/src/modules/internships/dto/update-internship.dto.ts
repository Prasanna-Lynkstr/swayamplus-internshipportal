import { PartialType } from '@nestjs/mapped-types';
import { CreateInternshipDto } from './create-internship.dto.js';

export class UpdateInternshipDto extends PartialType(CreateInternshipDto) {}
