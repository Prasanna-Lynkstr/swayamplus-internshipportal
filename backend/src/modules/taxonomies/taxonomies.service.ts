import { BadRequestException, Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Op } from '@sequelize/core';
import { TAXONOMY_VALUE_MODEL } from '../../database/database.constants.js';
import { TaxonomyValue } from '../../database/models/index.js';
import {
  TAXONOMY_DEFAULT_SEED,
  TAXONOMY_LIST_KEYS,
  isTaxonomyListKey,
  type TaxonomyListKey,
} from '../../common/constants/taxonomies.js';
import { CreateTaxonomyValueDto } from './dto/create-taxonomy-value.dto.js';
import { UpdateTaxonomyValueDto } from './dto/update-taxonomy-value.dto.js';

@Injectable()
export class TaxonomiesService implements OnModuleInit {
  constructor(
    @Inject(TAXONOMY_VALUE_MODEL) private readonly taxonomyValueModel: typeof TaxonomyValue,
  ) {}

  // Lazily backfills each list from TAXONOMY_DEFAULT_SEED the first time it's
  // empty (fresh database, or a list nobody has touched via the admin screen
  // yet) — same "seed on first use" shape as PlatformSettingsService's
  // findOrCreate, just across several rows instead of one singleton.
  async onModuleInit(): Promise<void> {
    for (const listKey of TAXONOMY_LIST_KEYS) {
      const count = await this.taxonomyValueModel.count({ where: { listKey } });
      if (count > 0) continue;
      const seed = TAXONOMY_DEFAULT_SEED[listKey];
      await this.taxonomyValueModel.bulkCreate(
        seed.map((entry, index) => ({
          listKey,
          value: entry.value,
          label: entry.label,
          sortOrder: index,
          isActive: true,
        })),
      );
    }
  }

  private assertKnownListKey(listKey: string): asserts listKey is TaxonomyListKey {
    if (!isTaxonomyListKey(listKey)) {
      throw new NotFoundException(`Unknown taxonomy list: ${listKey}`);
    }
  }

  listActive(listKey: string): Promise<TaxonomyValue[]> {
    this.assertKnownListKey(listKey);
    return this.taxonomyValueModel.findAll({
      where: { listKey, isActive: true },
      order: [['sortOrder', 'ASC']],
    });
  }

  listAll(listKey: string): Promise<TaxonomyValue[]> {
    this.assertKnownListKey(listKey);
    return this.taxonomyValueModel.findAll({
      where: { listKey },
      order: [['sortOrder', 'ASC']],
    });
  }

  async create(listKey: string, dto: CreateTaxonomyValueDto): Promise<TaxonomyValue> {
    this.assertKnownListKey(listKey);
    const existing = await this.taxonomyValueModel.findOne({ where: { listKey, value: dto.value } });
    if (existing) {
      throw new BadRequestException(`"${dto.value}" already exists in ${listKey}.`);
    }
    const sortOrder = dto.sortOrder ?? (await this.taxonomyValueModel.count({ where: { listKey } }));
    return this.taxonomyValueModel.create({
      listKey,
      value: dto.value,
      label: dto.label,
      sortOrder,
      isActive: true,
    });
  }

  async update(listKey: string, id: number, dto: UpdateTaxonomyValueDto): Promise<TaxonomyValue> {
    this.assertKnownListKey(listKey);
    const row = await this.taxonomyValueModel.findOne({ where: { id, listKey } });
    if (!row) {
      throw new NotFoundException('Taxonomy value not found.');
    }
    row.set(dto);
    await row.save();
    return row;
  }

  // Used by consuming services (internships, employers, students) to
  // validate write-path input against the current active values — replaces
  // the old hardcoded @IsIn([...]) validators.
  async assertValid(listKey: TaxonomyListKey, value: string | string[] | undefined | null): Promise<void> {
    if (value === undefined || value === null) return;
    const values = Array.isArray(value) ? value : [value];
    if (values.length === 0) return;
    const rows = await this.taxonomyValueModel.findAll({
      where: { listKey, isActive: true, value: { [Op.in]: values } },
    });
    const found = new Set(rows.map((row) => row.value));
    const invalid = values.filter((v) => !found.has(v));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid ${listKey} value(s): ${invalid.join(', ')}`);
    }
  }
}
