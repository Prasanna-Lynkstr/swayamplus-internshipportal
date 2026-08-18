'use client';

import { useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ProfilePrefill } from './ProfileFieldsCard';

interface ParseResumeResponse {
  resumeUrl: string;
  parsed: {
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
  };
}

// First step of student registration — upload once, and the extracted
// fields ride along as a `prefill` into the next step (ProfileFieldsCard),
// never saved directly. Skipping (no upload at all) is just "Continue" with
// nothing found — the resume itself can still be added later from the
// Photo & resume step, same as before this feature existed.
export function ResumeUploadStep({
  token,
  onContinue,
}: {
  token: string | null;
  onContinue: (prefill: ProfilePrefill | null) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [fileName, setFileName] = useState('');
  const [foundLabels, setFoundLabels] = useState<string[]>([]);
  const [textExtracted, setTextExtracted] = useState(true);
  const [prefill, setPrefill] = useState<ProfilePrefill | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setFileName(file.name);
    setStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiFetch<ParseResumeResponse>('/students/me/resume/parse', {
        method: 'POST',
        token,
        body: formData,
      });
      setStatus('done');
      setTextExtracted(result.parsed.textExtracted);
      if (!result.parsed.textExtracted) {
        setFoundLabels([]);
        setPrefill(null);
        return;
      }
      const labels: string[] = [];
      if (result.parsed.fullName) labels.push('name');
      if (result.parsed.phone) labels.push('phone');
      if (result.parsed.collegeName) labels.push('college');
      if (result.parsed.course) labels.push('course');
      if (result.parsed.graduationYear) labels.push('graduation year');
      if (result.parsed.city) labels.push('city');
      if (result.parsed.linkedinUrl) labels.push('LinkedIn');
      if (result.parsed.githubUrl) labels.push('GitHub');
      if (result.parsed.skills.length > 0) {
        labels.push(`${result.parsed.skills.length} skill${result.parsed.skills.length === 1 ? '' : 's'}`);
      }
      setFoundLabels(labels);
      setPrefill({
        fullName: result.parsed.fullName,
        phone: result.parsed.phone,
        collegeName: result.parsed.collegeName,
        course: result.parsed.course,
        graduationYear: result.parsed.graduationYear,
        city: result.parsed.city,
        linkedinUrl: result.parsed.linkedinUrl,
        githubUrl: result.parsed.githubUrl,
        skills: result.parsed.skills,
      });
    } catch {
      setStatus('error');
      setPrefill(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <h2 className="mb-2 text-lg font-bold text-sp-navy">Upload your resume</h2>
        <p className="mb-4 text-sm text-sp-ink-2">
          We&apos;ll try to pre-fill the next step from it — you can review and correct anything
          before saving. No resume handy? Click Continue and fill in the next step by hand; you can
          add one later too.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = '';
          }}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={status === 'uploading'}
            onClick={() => inputRef.current?.click()}
          >
            {status === 'uploading' ? 'Uploading…' : 'Choose file'}
          </Button>
          {fileName && <span className="text-sm text-sp-ink-3">{fileName}</span>}
        </div>

        {status === 'done' && foundLabels.length > 0 && (
          <p className="mt-3 text-sm font-semibold text-sp-good">
            Found: {foundLabels.join(', ')} — you&apos;ll see these pre-filled next.
          </p>
        )}
        {status === 'done' && !textExtracted && (
          <p className="mt-3 text-sm text-sp-ink-3">
            Uploaded, but we couldn&apos;t read this file automatically (a scanned copy, most
            likely) — no problem, you&apos;ll fill in the next step by hand.
          </p>
        )}
        {status === 'error' && (
          <p className="mt-3 text-sm font-semibold text-sp-danger">
            Upload failed — use a PDF or Word document under the size limit.
          </p>
        )}
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={() => onContinue(prefill)} disabled={status === 'uploading'} withArrow>
          Continue
        </Button>
      </div>
    </div>
  );
}
