import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const FIELD_BASE =
  'w-full rounded-sp-md border border-black/10 bg-sp-bg-elev px-4 py-3 text-sm text-sp-navy placeholder:text-sp-ink-3 focus:outline-none focus:ring-2 focus:ring-sp-orange/40 focus:border-sp-orange/60';

export function Label({
  children,
  htmlFor,
  required,
}: {
  children: string;
  htmlFor?: string;
  /** Renders a small marker next to the label — pair with a `required`
   * attribute on the field itself, this only handles the visual cue. */
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-bold text-sp-navy">
      {children}
      {required && (
        <span className="ml-0.5 text-sp-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${FIELD_BASE} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${FIELD_BASE} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${FIELD_BASE} ${props.className ?? ''}`} />;
}
