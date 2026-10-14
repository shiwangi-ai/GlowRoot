import type { ReactNode } from "react";
import { cn } from "./cn";

/** The uppercase kicker label with a carrot dash, `.eyebrow` in the prototype. */
export function Eyebrow({
  children,
  className,
  center,
}: {
  children: ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[10px] text-[13px] tracking-[.18em] uppercase font-semibold text-leaf",
        "before:content-[''] before:w-[26px] before:h-[2px] before:bg-carrot before:rounded-[2px]",
        center && "justify-center",
        className,
      )}
    >
      {children}
    </span>
  );
}
