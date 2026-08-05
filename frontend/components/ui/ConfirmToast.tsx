'use client';

export function ConfirmToast({
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  busy = false,
}: {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex flex-wrap items-center gap-4 rounded-sp-xl bg-sp-navy px-5 py-4 text-white shadow-lg shadow-black/30">
        <p className="text-sm font-semibold">{message}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold hover:bg-white/25 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50 ${
              danger ? 'bg-sp-danger hover:bg-red-700' : 'bg-sp-orange hover:bg-[#e2620f]'
            }`}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
