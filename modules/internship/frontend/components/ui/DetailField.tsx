import { Badge } from '@/components/ui/Badge';

// A definition-list field for the "full detail sheet" modals (internship
// posting details, applicant profile) — one label/value pair, consistent
// spacing and typography wherever a modal lays out a `<dl>` grid of them.
export function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">{label}</dt>
      <dd className="mt-0.5 text-sm text-sp-navy">{value || <span className="text-sp-ink-3">Not provided</span>}</dd>
    </div>
  );
}

// Same, but for a field whose value is a list of tags rather than one string
// (skills, preferred categories, etc.) — renders as Badge chips, or falls
// back to Field's "Not provided" empty state.
export function List({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return <Field label={label} value={null} />;
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-sp-ink-3">{label}</dt>
      <dd className="mt-1 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item}>{item}</Badge>
        ))}
      </dd>
    </div>
  );
}
