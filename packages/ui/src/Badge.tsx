import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone = "leaf" | "carrot" | "muted";

const tones: Record<BadgeTone, string> = {
  leaf: "text-leaf bg-[rgba(90,138,74,.14)]",
  carrot: "text-white bg-carrot",
  muted: "text-ink-soft bg-cream-2",
};

/** Small rounded label — the produce `.tag` / status chips. */
export function Badge({
  children,
  tone = "leaf",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block text-[11px] font-semibold tracking-[.08em] uppercase px-[10px] py-[3px] rounded-full",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
