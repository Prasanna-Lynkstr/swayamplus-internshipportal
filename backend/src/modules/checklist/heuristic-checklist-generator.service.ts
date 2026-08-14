import type { ChecklistGeneratorService } from './checklist.types.js';

// Default provider — no external dependency, always available. Splits the
// job description into candidate requirement/responsibility lines (bullets,
// sentences) rather than calling out to an LLM vendor. Deliberately simple:
// this is the safe fallback, not the primary intended experience — see
// AnthropicChecklistGeneratorService for the real LLM-derived path.
export class HeuristicChecklistGeneratorService implements ChecklistGeneratorService {
  constructor(private readonly maxItems: number = 6) {}

  async generate(description: string): Promise<string[]> {
    const candidates = description
      .split(/\r?\n|(?<=[.;])\s+/)
      .map((line) => line.replace(/^[\s•\-*\d.)]+/, '').trim())
      .filter((line) => line.length >= 15 && line.length <= 140);

    const seen = new Set<string>();
    const items: string[] = [];
    for (const candidate of candidates) {
      const normalized = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(normalized.endsWith('.') ? normalized.slice(0, -1) : normalized);
      if (items.length >= this.maxItems) break;
    }
    return items;
  }
}
