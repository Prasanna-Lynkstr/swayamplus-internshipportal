// A single message renders as plain inline text, same as every form already
// did. Multiple messages (typically every failed field from one submit,
// via ApiError.messages) render as a labeled, bulleted list instead of the
// comma-joined run-on sentence ApiError.message collapses them into.
export function FormError({ messages }: { messages: string[] }) {
  const items = messages.filter(Boolean);
  if (items.length === 0) return null;

  if (items.length === 1) {
    return <p className="text-sm font-semibold text-sp-danger">{items[0]}</p>;
  }

  return (
    <div className="rounded-sp-md bg-sp-danger-soft p-3">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-sp-danger">
        Please fix the following:
      </p>
      <ul className="list-disc space-y-0.5 pl-4 text-sm font-semibold text-sp-danger">
        {items.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
