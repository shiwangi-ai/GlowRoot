"use client";

import { useEffect } from "react";

/** Corner confirmation for a completed action. Clears itself after 3.2s. */
export function Toast({
  message,
  tone = "ok",
  onDone,
}: {
  message: string | null;
  tone?: "ok" | "error";
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div
      role="status"
      className={`fixed right-5 top-5 z-[70] max-w-[360px] rounded-xl px-4 py-3 text-[13px] font-semibold text-white shadow-pop ${
        tone === "error" ? "bg-carrot" : "bg-leaf"
      }`}
    >
      {message}
    </div>
  );
}
