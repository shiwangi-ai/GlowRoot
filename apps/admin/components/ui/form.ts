/**
 * Shared class strings for admin forms and controls.
 *
 * The management screens are built from the same handful of shapes, so the
 * styling lives in one place rather than being retyped into every input.
 */

export const inputCls =
  "mt-1.5 w-full rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[14px] outline-none focus:border-leaf";

export const labelCls = "block text-[13px] font-semibold";

export const selectCls =
  "rounded-xl border border-line bg-cream px-3 py-2.5 text-[13px] outline-none focus:border-leaf";

export const btnPrimary =
  "rounded-full bg-leaf px-5 py-2.5 text-[13px] font-bold text-white hover:bg-leaf-deep disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "rounded-full border border-line px-4 py-2 text-[12.5px] font-semibold hover:border-leaf disabled:opacity-50";

export const btnDanger =
  "rounded-full border border-carrot/40 px-4 py-2 text-[12.5px] font-semibold text-carrot hover:bg-carrot/[.08] disabled:opacity-50";
