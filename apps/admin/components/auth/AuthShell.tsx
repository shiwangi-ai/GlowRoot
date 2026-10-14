import Image from "next/image";
import Link from "next/link";

/** Shared chrome for every unauthenticated screen. */
export function AuthShell({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-[440px] rounded-3xl border border-line bg-paper p-8 shadow-card md:p-10">
        <Link href="/login">
          <Image
            src="/assets/glowroot-logo-trim.png"
            alt="GlowRoot"
            width={150}
            height={51}
            priority
            className="h-auto w-[150px]"
          />
        </Link>
        <div className="mt-7 text-[11px] font-semibold uppercase tracking-[.14em] text-leaf">
          {eyebrow}
        </div>
        <h1 className="mt-2 text-[30px]">{title}</h1>
        <p className="mt-2 text-[14px] text-ink-soft">{intro}</p>
        {children}
        {footer ? (
          <div className="mt-6 text-center text-[12px] text-ink-soft">
            {footer}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export const authInputClass =
  "w-full rounded-xl border border-line bg-cream px-3.5 py-3 text-[15px] outline-none transition-colors focus:border-leaf focus:ring-2 focus:ring-leaf/15";

export const authButtonClass =
  "w-full rounded-full bg-leaf px-5 py-3 font-display text-[15px] font-bold text-white transition-colors hover:bg-leaf-deep disabled:cursor-not-allowed disabled:opacity-55";

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-carrot/40 bg-carrot/[.08] px-4 py-3 text-[13px] text-carrot"
    >
      {children}
    </p>
  );
}

export function AuthNotice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-xl border border-leaf/35 bg-[rgba(90,138,74,.08)] px-4 py-3 text-[13px] text-leaf"
    >
      {children}
    </p>
  );
}
