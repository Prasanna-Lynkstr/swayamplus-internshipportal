import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { APP_LOGGER } from '../../common/logging/app-logger.constants.js';
import type { AppLogger } from '../../common/logging/app-logger.types.js';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service.js';
import { EMPTY_PARSED_RESUME_FIELDS } from './resume-parser.types.js';
import type { ParsedResumeFields, ResumeFieldExtractor } from './resume-parser.types.js';
import { HeuristicResumeExtractorService } from './heuristic-resume-extractor.service.js';
import { AnthropicResumeExtractorService } from './anthropic-resume-extractor.service.js';
import { OpenAiResumeExtractorService } from './openai-resume-extractor.service.js';

// A resume with less extracted text than this is almost certainly a scanned
// image with no real text layer (or extraction otherwise failed), not a
// short-but-genuine resume — treated as "couldn't read this," not "read it
// and found nothing."
const MIN_TEXT_LENGTH_FOR_PARSE = 30;

// Orchestrates resume-field extraction: does the (provider-independent) raw
// text extraction from the uploaded file, then — if resumeParsingEnabled is
// on — dispatches to whichever ResumeFieldExtractor the admin has selected
// (resumeParsingProvider), reading that from PlatformSettingsService per
// request rather than once at boot, since this needs to be flippable from
// /admin/settings without a redeploy. When disabled, no extractor runs at
// all (not even the heuristic one) — that's the point of the toggle: an
// explicit "don't parse resumes" choice, not a degraded-mode fallback.
@Injectable()
export class ResumeParserService {
  private readonly heuristic = new HeuristicResumeExtractorService();

  constructor(
    private readonly configService: ConfigService,
    private readonly platformSettingsService: PlatformSettingsService,
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
  ) {}

  async parse(buffer: Buffer, mimeType: string): Promise<ParsedResumeFields> {
    // A file that claims to be a PDF/DOCX but isn't a valid one (corrupted
    // upload, mislabeled extension) throws from the underlying library —
    // treated the same as "couldn't read this," never a 500 back to a
    // student mid-registration over a best-effort convenience feature.
    const text = await this.extractText(buffer, mimeType).catch(() => '');
    if (!text || text.trim().length < MIN_TEXT_LENGTH_FOR_PARSE) {
      return EMPTY_PARSED_RESUME_FIELDS;
    }

    const settings = await this.platformSettingsService.getSettings();
    if (!settings.resumeParsingEnabled) {
      return EMPTY_PARSED_RESUME_FIELDS;
    }

    const extractor = this.resolveExtractor(settings.resumeParsingProvider);
    const fields = await extractor.extractFields(text);
    return { ...fields, textExtracted: true };
  }

  private resolveExtractor(provider: 'anthropic' | 'openai'): ResumeFieldExtractor {
    if (provider === 'anthropic') {
      const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY', '');
      if (!apiKey) return this.heuristic;
      const model = this.configService.get<string>(
        'RESUME_PARSER_ANTHROPIC_MODEL',
        'claude-haiku-4-5-20251001',
      );
      return new AnthropicResumeExtractorService(apiKey, model, this.logger);
    }
    const apiKey = this.configService.get<string>('OPENAI_API_KEY', '');
    if (!apiKey) return this.heuristic;
    const model = this.configService.get<string>('RESUME_PARSER_OPENAI_MODEL', 'gpt-4o-mini');
    return new OpenAiResumeExtractorService(apiKey, model, this.logger);
  }

  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return result.text ?? '';
      } finally {
        await parser.destroy();
      }
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? '';
    }
    // Legacy .doc (application/msword, still in RESUME_MIME_TYPES for upload
    // purposes) has no viable pure-JS extractor — returning empty text here
    // routes it through the same "couldn't read this automatically" path as
    // a scanned PDF, rather than adding a heavier native-binding dependency
    // for a rarely-used legacy format.
    return '';
  }
}
