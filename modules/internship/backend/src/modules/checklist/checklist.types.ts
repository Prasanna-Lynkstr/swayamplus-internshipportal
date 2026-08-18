/**
 * Swap boundary for the AI-generated applicant checklist: everything that
 * needs a checklist from a job description depends on this interface, never
 * on a concrete LLM vendor SDK directly. Toggle providers via
 * CHECKLIST_PROVIDER — 'heuristic' (default, no external dependency) or
 * 'anthropic' (calls the Claude API; falls back to heuristic if no
 * ANTHROPIC_API_KEY is configured — same "empty env var = dev-safe default"
 * pattern as SMTP/R2).
 */
export interface ChecklistGeneratorService {
  /** Suggests a short list of applicant-checklist items from a job description. */
  generate(description: string): Promise<string[]>;
}
