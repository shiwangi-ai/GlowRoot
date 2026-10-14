import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/seasonal", label: "Seasonal harvest" },
      { href: "/#process", label: "How it's made" },
      { href: "/products", label: "Our juices" },
      { href: "/#benefits", label: "Why cold-pressed" },
    ],
  },
  {
    title: "Order",
    links: [
      { href: "/products", label: "Single bottles" },
      { href: "/combos", label: "Juice boxes" },
      { href: "/subscribe", label: "Weekly subscription" },
      { href: "/combos", label: "Corporate & events" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-paper border-t border-line pt-14 pb-8">
      <div className="max-w-wrap mx-auto px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-9">
          <div>
            <Image
              src="/assets/glowroot-logo-trim.png"
              alt="GlowRoot"
              width={150}
              height={54}
              className="theme-logo h-[54px] w-auto mb-4"
            />
            <p className="text-[14.5px] text-ink-soft max-w-[280px]">
              Cold-pressed juices made from whole, seasonal fruit and
              vegetables. Picked fresh, pressed slow, delivered cold.
            </p>
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-[15px] tracking-[.04em] mb-4">
                {col.title}
              </h4>
              {col.links.map((l) => (
                <Link
                  key={l.href + l.label}
                  href={l.href}
                  className="block text-sm text-ink-soft mb-2.5 hover:text-leaf"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
          <div>
            <h4 className="font-display text-[15px] tracking-[.04em] mb-4">
              Visit & contact
            </h4>
            <Link
              href="/stores"
              className="block text-sm text-leaf mb-2.5 font-semibold"
            >
              Find a GlowRoot store
            </Link>
            <p className="text-sm text-ink-soft mb-2.5">
              Open daily · 7am – 8pm
            </p>
            <a
              href="mailto:hello@glowroot.co"
              className="block text-sm text-ink-soft mb-2.5 hover:text-leaf"
            >
              hello@glowroot.co
            </a>
            <a
              href="tel:+910000000000"
              className="block text-sm text-ink-soft mb-2.5 hover:text-leaf"
            >
              +91 00000 00000
            </a>
            <a
              href="#"
              className="block text-sm text-ink-soft mb-2.5 hover:text-leaf"
            >
              Instagram
            </a>
          </div>
        </div>
        <div className="flex justify-between items-center gap-4 flex-wrap mt-11 pt-5.5 border-t border-line text-[13px] text-ink-soft">
          <span>© 2026 GlowRoot. Made with whole fruit &amp; roots.</span>
          <span>Pressed fresh, every single day.</span>
        </div>
      </div>
    </footer>
  );
}
