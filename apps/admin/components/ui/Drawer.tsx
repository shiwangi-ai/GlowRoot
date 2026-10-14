"use client";

import { useEffect } from "react";

/**
 * The right-hand editing panel used by every admin management screen.
 *
 * Escape closes it and the backdrop is click-to-dismiss, so a half-filled form
 * is never a trap. Rendering nothing when closed keeps the form state fresh on
 * each open — callers pass a `key` when they want the opposite.
 */
export function Drawer({
  open,
  eyebrow,
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/30"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-[540px] overflow-y-auto border-l border-line bg-paper p-6 shadow-pop md:p-8"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.13em] text-leaf">
              {eyebrow}
            </div>
            <h2 className="mt-1 text-[26px]">{title}</h2>
            {subtitle ? (
              <p className="mt-2 text-[14px] text-ink-soft">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-xl text-ink-soft hover:border-leaf hover:text-leaf"
          >
            ×
          </button>
        </div>

        <div className="mt-7">{children}</div>

        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
          {footer}
        </div>
      </div>
    </div>
  );
}
