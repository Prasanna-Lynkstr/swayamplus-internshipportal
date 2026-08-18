import type { ExtractedResumeContent, ResumeFieldExtractor } from './resume-parser.types.js';
import { HeuristicResumeExtractorService } from './heuristic-resume-extractor.service.js';
import type { AppLogger } from '../../common/logging/app-logger.types.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function buildPrompt(resumeText: string): string {
  return (
    'Extract structured fields from this resume text for a student internship platform. ' +
    'Return ONLY a single JSON object with exactly these keys:\n' +
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

// LLM-derived resume field extraction via OpenAI. Falls back to the
// heuristic extractor (rather than throwing) on any API failure or
// unparseable response — same resilience posture as the Anthropic path, so
// switching resumeParsingProvider in /admin/settings never changes what
// happens on a vendor outage, only which vendor is tried first.
export class OpenAiResumeExtractorService implements ResumeFieldExtractor {
  private readonly fallback = new HeuristicResumeExtractorService();

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly logger: AppLogger,
  ) {}

  async extractFields(resumeText: string): Promise<ExtractedResumeContent> {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: buildPrompt(resumeText) }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API responded with ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? '';
      if (!text) throw new Error('OpenAI API returned no usable content');
      return parseJsonResponse(text);
    } catch (error) {
      this.logger.warn(
        `Falling back to heuristic resume extraction: ${error instanceof Error ? error.message : error}`,
        OpenAiResumeExtractorService.name,
      );
      return this.fallback.extractFields(resumeText);
    }
  }
}
