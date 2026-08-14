import type { ChecklistGeneratorService } from './checklist.types.js';
import { HeuristicChecklistGeneratorService } from './heuristic-checklist-generator.service.js';
import type { AppLogger } from '../../common/logging/app-logger.types.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// LLM-derived checklist generation. Falls back to the heuristic provider
// (rather than throwing) on any API failure — a flaky/misconfigured vendor
// call should never block an employer from posting an internship.
export class AnthropicChecklistGeneratorService implements ChecklistGeneratorService {
  private readonly fallback: HeuristicChecklistGeneratorService;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly maxItems: number,
    private readonly logger: AppLogger,
  ) {
    this.fallback = new HeuristicChecklistGeneratorService(maxItems);
  }

  async generate(description: string): Promise<string[]> {
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content:
                `Read this internship job description and produce a short applicant checklist: ` +
                `concrete, verifiable things a student should be able to say "yes I have/can do this" ` +
                `to before applying (skills, tools, prior experience, availability). ` +
                `Return at most ${this.maxItems} items, one per line, no numbering, no bullets, no extra commentary.\n\n` +
                `Job description:\n${description}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API responded with ${response.status}`);
      }

      const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = data.content?.find((block) => block.type === 'text')?.text ?? '';
      const items = text
        .split('\n')
        .map((line) => line.replace(/^[\s•\-*\d.)]+/, '').trim())
        .filter(Boolean)
        .slice(0, this.maxItems);

      if (items.length === 0) {
        throw new Error('Anthropic API returned no usable checklist items');
      }
      return items;
    } catch (error) {
      this.logger.warn(
        `Falling back to heuristic checklist generation: ${error instanceof Error ? error.message : error}`,
        AnthropicChecklistGeneratorService.name,
      );
      return this.fallback.generate(description);
    }
  }
}
