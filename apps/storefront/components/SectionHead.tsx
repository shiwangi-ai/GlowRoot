import type { ReactNode } from "react";
import { Eyebrow } from "@glowroot/ui";

/** The `.sec-head` eyebrow + headline + intro block. */
export function SectionHead({
  eyebrow,
  title,
  intro,
  center,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  center?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`${center ? "text-center max-w-[640px] mx-auto" : "max-w-[620px]"} ${
        className ?? ""
      }`}
    >
      <Eyebrow center={center}>{eyebrow}</Eyebrow>
      <h2 className="text-[clamp(32px,4vw,46px)] mt-4">{title}</h2>
      {intro ? <p className="text-[17px] text-ink-soft mt-4">{intro}</p> : null}
    </div>
  );
}
