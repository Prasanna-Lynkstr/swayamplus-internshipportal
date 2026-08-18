import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';

// A curated keyword list, not a taxonomy — this only drives best-effort
// resume autofill (heuristic substring matching), never validated against or
// synced with anything a student/employer picks elsewhere in the app.
const KNOWN_SKILLS = [
  'React', 'Node.js', 'Python', 'Java', 'JavaScript', 'TypeScript', 'SQL', 'HTML', 'CSS',
  'Data Analysis', 'Machine Learning', 'AWS', 'Git', 'Figma', 'UI Design', 'UX Design',
  'Content Writing', 'Copywriting', 'SEO', 'Digital Marketing', 'Social Media Management',
  'Excel', 'Power BI', 'Tableau', 'Tally', 'Communication', 'Project Management', 'Sales',
  'CRM', 'Photoshop', 'Video Editing', 'C++', 'C#', 'PHP', 'Angular', 'Vue.js', 'Django',
  'Flask', 'MongoDB', 'PostgreSQL', 'Docker', 'Kubernetes', 'REST API', 'GraphQL',
];
const COLLEGE_KEYWORDS = [
  'university', 'college', 'institute of technology', 'iit', 'nit', 'polytechnic',
  'institute of management', 'school of', 'vidyapeetham', 'vishwavidyalaya',
];
// Ordered longest/most-specific first so e.g. "M.Tech" doesn't get shadowed
// by a looser pattern matching first.
const DEGREE_PATTERNS = [
  /B\.?\s?Tech\.?/i, /M\.?\s?Tech\.?/i, /B\.?\s?E\.?/i, /M\.?\s?E\.?/i,
  /BCA/i, /MCA/i, /MBA/i, /BBA/i, /B\.?\s?Com\.?/i, /M\.?\s?Com\.?/i,
  /B\.?\s?Sc\.?/i, /M\.?\s?Sc\.?/i, /B\.?\s?A\.?/i, /M\.?\s?A\.?/i, /B\.?\s?Des\.?/i,
];
// Real resumes almost never print a phone number as one unbroken run of
// digits — "+91 98765 43210", "9876-543-210", "(91) 98765 43210" are all
// common. Matches a loose window of digits/separators, then strips
// separators and validates the actual digit count/prefix afterward, rather
// than trying to encode every separator pattern into the regex itself.
const PHONE_CANDIDATE_REGEX = /(?:\+?91[\s.-]?)?[6-9][\d\s.-]{9,16}/g;
const YEAR_REGEX = /\b(20\d{2})\b/g;
// Lines this early in a resume that are clearly *not* a name — a section
// header, the literal document title, or a contact-detail line a template's
// text-extraction order might put ahead of the actual name.
const NON_NAME_LINE_KEYWORDS = [
  'resume', 'curriculum vitae', 'cv', 'profile', 'summary', 'objective',
  'contact', 'address', 'email', 'phone', 'mobile', 'linkedin', 'github',
  'skills', 'education', 'experience', 'about me',
];
// A resume with less extracted text than this is almost certainly a scanned
// image with no real text layer (or extraction otherwise failed), not a
// short-but-genuine resume — treated as "couldn't read this," not "read it
// and found nothing."
const MIN_TEXT_LENGTH_FOR_PARSE = 30;

export interface ParsedResumeFields {
  fullName: string | null;
  phone: string | null;
  collegeName: string | null;
  course: string | null;
  graduationYear: number | null;
  skills: string[];
  textExtracted: boolean;
}

const EMPTY_RESULT: ParsedResumeFields = {
  fullName: null,
  phone: null,
  collegeName: null,
  course: null,
  graduationYear: null,
  skills: [],
  textExtracted: false,
};

// Heuristic only — regex/keyword matching over extracted plain text, no LLM
// call. Every field is a *suggestion* for the student to review, never
// written to the profile directly — resumes are free-form enough that a
// false-positive guess (wrong name split, an admission year mistaken for a
// graduation year) is a certainty over enough resumes, not an edge case.
@Injectable()
export class ResumeParserService {
  async parse(buffer: Buffer, mimeType: string): Promise<ParsedResumeFields> {
    // A file that claims to be a PDF/DOCX but isn't a valid one (corrupted
    // upload, mislabeled extension) throws from the underlying library —
    // treated the same as "couldn't read this," never a 500 back to a
    // student mid-registration over a best-effort convenience feature.
    const text = await this.extractText(buffer, mimeType).catch(() => '');
    if (!text || text.trim().length < MIN_TEXT_LENGTH_FOR_PARSE) {
      return EMPTY_RESULT;
    }
    return {
      fullName: this.guessFullName(text),
      phone: this.guessPhone(text),
      collegeName: this.guessCollegeName(text),
      course: this.guessCourse(text),
      graduationYear: this.guessGraduationYear(text),
      skills: this.guessSkills(text),
      textExtracted: true,
    };
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

  private guessPhone(text: string): string | null {
    const candidates = text.match(PHONE_CANDIDATE_REGEX) ?? [];
    for (const candidate of candidates) {
      let digits = candidate.replace(/\D/g, '');
      if (digits.length >= 12 && digits.startsWith('91')) digits = digits.slice(2);
      // Take just the first 10 digits rather than requiring an exact-length
      // match — the candidate window can greedily sweep in a few extra
      // trailing digits (e.g. a nearby year with only a space between) and
      // that shouldn't sink an otherwise-valid match.
      if (digits.length >= 10 && /^[6-9]\d{9}$/.test(digits.slice(0, 10))) {
        return digits.slice(0, 10);
      }
    }
    return null;
  }

  private guessSkills(text: string): string[] {
    const lower = text.toLowerCase();
    return KNOWN_SKILLS.filter((skill) => lower.includes(skill.toLowerCase()));
  }

  private guessCollegeName(text: string): string | null {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const line = lines.find((l) => COLLEGE_KEYWORDS.some((kw) => l.toLowerCase().includes(kw)));
    return line ? line.slice(0, 120) : null;
  }

  private guessCourse(text: string): string | null {
    for (const pattern of DEGREE_PATTERNS) {
      const match = text.match(pattern);
      if (match) return match[0].replace(/\s+/g, ' ').trim();
    }
    return null;
  }

  private guessGraduationYear(text: string): number | null {
    const currentYear = new Date().getFullYear();
    const years = [...text.matchAll(YEAR_REGEX)].map((m) => Number(m[1]));
    const plausible = years.filter((y) => y >= currentYear - 1 && y <= currentYear + 6);
    if (plausible.length === 0) return null;
    // The latest plausible year mentioned is the better guess for "expected
    // graduation" — a resume listing both an admission year and a
    // graduation year should surface the later one.
    return Math.max(...plausible);
  }

  // Scans the first several lines, not just the very first one — a PDF's
  // text-extraction order doesn't always match visual order (a template
  // with a contact sidebar or a "CURRICULUM VITAE" title can easily put
  // something ahead of the actual name), so anchoring on line 1 alone missed
  // the name on a real resume more often than not.
  private guessFullName(text: string): string | null {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 8);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (NON_NAME_LINE_KEYWORDS.some((kw) => lower.includes(kw))) continue;
      if (/[@\d]/.test(line)) continue;
      const words = line.split(/\s+/);
      if (words.length < 2 || words.length > 4) continue;
      // Middle words may be a single-letter initial ("Anjali R Nair") — only
      // the first/last are required to be real name-length words.
      const allWordShaped = words.every((w) => /^[A-Za-z.'-]+$/.test(w));
      const endsAreNameLength = words[0].length > 1 && words[words.length - 1].length > 1;
      if (allWordShaped && endsAreNameLength) return line;
    }
    return null;
  }
}
