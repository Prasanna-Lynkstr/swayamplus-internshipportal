import type { ExtractedResumeContent, ResumeFieldExtractor } from './resume-parser.types.js';
import { HeuristicResumeExtractorService } from './heuristic-resume-extractor.service.js';
import type { AppLogger } from '../../common/logging/app-logger.types.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function buildPrompt(resumeText: string): string {
  return (
    'Extract structured fields from this resume text for a student internship platform. ' +
    'Return ONLY a single JSON object — no markdown fences, no commentary before or after — ' +
    'with exactly these keys:\n' +
    '{"fullName": string|null, "phone": string|null (Indian mobile number, 10 digits only, no ' +
    'country code, no spaces/dashes), "collegeName": string|null, "course": string|null (the ' +
    'degree, e.g. "B.Tech Computer Science"), "graduationYear": number|null (4-digit year), ' +
    '"city": string|null (the city the person currently lives in, not a college\'s city if ' +
    'different), "linkedinUrl": string|null (full URL if a LinkedIn profile is mentioned), ' +
    '"githubUrl": string|null (full URL if a GitHub profile is mentioned), ' +
    '"skills": string[] (technical/professional skills actually mentioned, not invented)}\n' +
    'Use null (or [] for skills) for anything you cannot confidently determine from the text — ' +
    'never invent information that is not present.\n\n' +
    `Resume text:\n${resumeText}`
  );
}

// The profile form's linkedinUrl/githubUrl fields expect a real URL — models
// sometimes return a bare domain ("linkedin.com/in/x") despite the prompt
// asking for a full URL, so this is enforced here rather than trusted.
function normalizeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  return value.startsWith('http') ? value : `https://${value}`;
}

function parseJsonResponse(text: string): ExtractedResumeContent {
  // Models occasionally wrap JSON in a markdown fence despite being told not
  // to — strip it rather than failing the whole extraction over formatting.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned) as Partial<ExtractedResumeContent>;
  return {
    fullName: typeof parsed.fullName === 'string' ? parsed.fullName : null,
    phone: typeof parsed.phone === 'string' ? parsed.phone.replace(/\D/g, '').slice(-10) || null : null,
    collegeName: typeof parsed.collegeName === 'string' ? parsed.collegeName : null,
    course: typeof parsed.course === 'string' ? parsed.course : null,
    graduationYear: typeof parsed.graduationYear === 'number' ? parsed.graduationYear : null,
    city: typeof parsed.city === 'string' ? parsed.city : null,
    linkedinUrl: normalizeUrl(parsed.linkedinUrl),
    githubUrl: normalizeUrl(parsed.githubUrl),
    skills: Array.isArray(parsed.skills) ? parsed.skills.filter((s) => typeof s === 'string') : [],
  };
}

// LLM-derived resume field extraction via Claude. Falls back to the
// heuristic extractor (rather than throwing) on any API failure or
// unparseable response — a flaky/misconfigured vendor call should never
// block a student mid-registration over a best-effort convenience feature.
export class AnthropicResumeExtractorService implements ResumeFieldExtractor {
  private readonly fallback = new HeuristicResumeExtractorService();

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly logger: AppLogger,
  ) {}

  async extractFields(resumeText: string): Promise<ExtractedResumeContent> {
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
          messages: [{ role: 'user', content: buildPrompt(resumeText) }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API responded with ${response.status}`);
      }

      const data = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = data.content?.find((block) => block.type === 'text')?.text ?? '';
      if (!text) throw new Error('Anthropic API returned no usable content');
      return parseJsonResponse(text);
    } catch (error) {
      this.logger.warn(
        `Falling back to heuristic resume extraction: ${error instanceof Error ? error.message : error}`,
        AnthropicResumeExtractorService.name,
      );
      return this.fallback.extractFields(resumeText);
    }
  }
}
