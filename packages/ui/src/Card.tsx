import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/** Paper card surface used throughout (`background:var(--paper)` + line border). */
export function Card({
  children,
  className,
  ...rest
}: { children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-paper border border-line rounded-3xl overflow-hidden",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
