import { BadRequestException, Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
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
  // In-process cache-aside — this whole dataset is a handful of rows per
  // list, read on nearly every mutating write across three modules
  // (assertValid) plus every public dropdown fetch (listActive), but written
  // to only via the admin taxonomy screen. That access pattern is exactly
  // what this codebase's own scalability review flagged as an uncached hot
  // path (see docs' Redis recommendation) — a plain in-memory map closes it
  // without standing up Redis for a dataset this size. Caveat, worth
  // revisiting if this ever runs as more than one instance: a write on
  // instance A only invalidates instance A's cache, so instance B would
  // serve stale taxonomy data until its own next write or a restart — the
  // same cross-instance gap Redis would exist to close.
  private readonly cache = new Map<TaxonomyListKey, TaxonomyValue[]>();

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

  // The one place that actually touches the database for a read — every
  // other read method goes through this and gets the cached array back
  // (or populates it on a miss). Callers only ever read fields off these
  // rows (value/label/isActive/sortOrder), never mutate or save them, so a
  // shared cached array is safe to hand back as-is.
  private async getAll(listKey: TaxonomyListKey): Promise<TaxonomyValue[]> {
    const cached = this.cache.get(listKey);
    if (cached) return cached;
    const rows = await this.taxonomyValueModel.findAll({
      where: { listKey },
      order: [['sortOrder', 'ASC']],
    });
    this.cache.set(listKey, rows);
    return rows;
  }

  private invalidate(listKey: TaxonomyListKey): void {
    this.cache.delete(listKey);
  }

  async listActive(listKey: string): Promise<TaxonomyValue[]> {
    this.assertKnownListKey(listKey);
    const rows = await this.getAll(listKey);
    return rows.filter((row) => row.isActive);
  }

  async listAll(listKey: string): Promise<TaxonomyValue[]> {
    this.assertKnownListKey(listKey);
    return this.getAll(listKey);
  }

  async create(listKey: string, dto: CreateTaxonomyValueDto): Promise<TaxonomyValue> {
    this.assertKnownListKey(listKey);
    const existing = await this.taxonomyValueModel.findOne({ where: { listKey, value: dto.value } });
    if (existing) {
      throw new BadRequestException(`"${dto.value}" already exists in ${listKey}.`);
    }
    const sortOrder = dto.sortOrder ?? (await this.taxonomyValueModel.count({ where: { listKey } }));
    const created = await this.taxonomyValueModel.create({
      listKey,
      value: dto.value,
      label: dto.label,
      sortOrder,
      isActive: true,
    });
    this.invalidate(listKey);
    return created;
  }

  async update(listKey: string, id: number, dto: UpdateTaxonomyValueDto): Promise<TaxonomyValue> {
    this.assertKnownListKey(listKey);
    const row = await this.taxonomyValueModel.findOne({ where: { id, listKey } });
    if (!row) {
      throw new NotFoundException('Taxonomy value not found.');
    }
    row.set(dto);
    await row.save();
    this.invalidate(listKey);
    return row;
  }

  // Used by consuming services (internships, employers, students) to
  // validate write-path input against the current active values — replaces
  // the old hardcoded @IsIn([...]) validators. Routed through the same cache
  // as listActive rather than its own direct Op.in query, since this is the
  // single hottest call site (every internship/employer/student mutating
  // write hits it, several times per request).
  async assertValid(listKey: TaxonomyListKey, value: string | string[] | undefined | null): Promise<void> {
    if (value === undefined || value === null) return;
    const values = Array.isArray(value) ? value : [value];
    if (values.length === 0) return;
    const active = await this.listActive(listKey);
    const found = new Set(active.map((row) => row.value));
    const invalid = values.filter((v) => !found.has(v));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid ${listKey} value(s): ${invalid.join(', ')}`);
    }
  }
}
