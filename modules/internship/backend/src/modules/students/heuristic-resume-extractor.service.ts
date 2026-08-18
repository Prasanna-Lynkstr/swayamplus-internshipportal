import type { ExtractedResumeContent, ResumeFieldExtractor } from './resume-parser.types.js';

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
// Major Indian cities only — a resume's city is usually a bare place name
// with no surrounding label, so there's no structural cue to anchor on the
// way there is for phone/email; a curated list is the only heuristic that
// works at all here. Not exhaustive — this is the fallback path, not the
// primary one now that AI-assisted extraction exists.
const CITY_NAMES = [
  'Mumbai', 'Delhi', 'New Delhi', 'Bengaluru', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal',
  'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
  'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Amritsar', 'Navi Mumbai',
  'Coimbatore', 'Madurai', 'Guwahati', 'Chandigarh', 'Thiruvananthapuram', 'Mysuru', 'Mysore',
  'Tiruchirappalli', 'Gurgaon', 'Gurugram', 'Noida', 'Jamshedpur', 'Bhubaneswar', 'Kochi',
  'Cochin', 'Dehradun', 'Jammu', 'Mangaluru', 'Mangalore', 'Salem', 'Tirupati', 'Vellore',
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

// Heuristic only — regex/keyword matching over extracted plain text, no LLM
// call, no external dependency. The zero-config default (and the fallback
// every AI-backed extractor uses on failure) — every field is a *suggestion*
// for the student to review, never written to the profile directly.
export class HeuristicResumeExtractorService implements ResumeFieldExtractor {
  async extractFields(text: string): Promise<ExtractedResumeContent> {
    return {
      fullName: this.guessFullName(text),
      phone: this.guessPhone(text),
      collegeName: this.guessCollegeName(text),
      course: this.guessCourse(text),
      graduationYear: this.guessGraduationYear(text),
      city: this.guessCity(text),
      linkedinUrl: this.guessUrl(text, 'linkedin.com'),
      githubUrl: this.guessUrl(text, 'github.com'),
      skills: this.guessSkills(text),
    };
  }

  private guessCity(text: string): string | null {
    for (const city of CITY_NAMES) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(text)) return city;
    }
    return null;
  }

  // Only catches a URL that appears as visible text (e.g. "linkedin.com/in/
  // priyasharma" typed out) — a hyperlink whose display text is just the
  // word "LinkedIn" with the real URL only in the PDF's link annotation is
  // invisible to plain text extraction and won't be found here.
  private guessUrl(text: string, domain: string): string | null {
    const match = text.match(new RegExp(`(https?://)?(www\\.)?${domain.replace('.', '\\.')}/\\S+`, 'i'));
    if (!match) return null;
    const raw = match[0].replace(/[),.]+$/, '');
    return raw.startsWith('http') ? raw : `https://${raw}`;
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
