import type { ReactNode } from "react";
import { ModuleIcon, type ModuleIconName } from "@/components/ModuleIcon";

export function ModuleHeading({
  icon,
  title,
  description,
  eyebrow,
}: {
  icon: ModuleIconName;
  title: string;
  description?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-3.5">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-leaf/15 bg-leaf/[.07] text-leaf [&>svg]:h-6 [&>svg]:w-6">
        <ModuleIcon name={icon} />
      </span>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[.13em] text-leaf">
            {eyebrow}
          </p>
        )}
        <h1 className="break-words text-3xl leading-tight tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-[640px] text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
