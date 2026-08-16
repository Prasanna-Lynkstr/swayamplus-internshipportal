'use client';

import { createPortal } from 'react-dom';

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
  if (typeof document === 'undefined') return null;

  // Portalled to document.body — like any other modal on this admin page,
  // not just in-place in the page tree — so it always paints (and receives
  // clicks) above an already-open full-screen modal. A modal portal and an
  // in-place-rendered toast share the same z-50, but the modal's portal
  // node is a later sibling of <body>'s page-content node either way, so an
  // in-place toast nested inside that page content would always lose the
  // stacking order and silently eat its own clicks.
  return createPortal(
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
    </div>,
    document.body,
  );
}
