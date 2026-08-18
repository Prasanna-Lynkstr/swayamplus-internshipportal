export interface ParsedResumeFields {
  fullName: string | null;
  phone: string | null;
  collegeName: string | null;
  course: string | null;
  graduationYear: number | null;
  city: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  skills: string[];
  textExtracted: boolean;
}

export const EMPTY_PARSED_RESUME_FIELDS: ParsedResumeFields = {
  fullName: null,
  phone: null,
  collegeName: null,
  course: null,
  graduationYear: null,
  city: null,
  linkedinUrl: null,
  githubUrl: null,
  skills: [],
  textExtracted: false,
};

export type ExtractedResumeContent = Omit<ParsedResumeFields, 'textExtracted'>;

/**
 * Swap boundary for turning a resume's raw extracted text into structured
 * fields — everything that needs this depends on this interface, never on a
 * concrete provider directly. Which implementation runs is decided per
 * request from admin-toggleable platform settings
 * (resumeParsingEnabled/resumeParsingProvider — see PlatformSettingsService),
 * not a boot-time env var like the checklist generator's CHECKLIST_PROVIDER,
 * since this needs to be flippable from /admin/settings without a redeploy.
 * Implementations only ever get called with non-empty text (the orchestrator
 * handles the "couldn't read this file at all" case itself), so they return
 * just the content fields — `textExtracted` isn't theirs to set.
 */
export interface ResumeFieldExtractor {
  extractFields(resumeText: string): Promise<ExtractedResumeContent>;
}
