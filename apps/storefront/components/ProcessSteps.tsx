import type { ReactNode } from "react";
import { SectionHead } from "./SectionHead";
import { BrandFilm } from "./BrandFilm";

const steps: { num: string; title: string; body: string; icon: ReactNode }[] = [
  {
    num: "STEP 01",
    title: "Handpicked daily",
    body: "We source from local farms each morning, choosing only fruit and vegetables at their ripest.",
    icon: (
      <path d="M12 21c-4-2-7-5-7-10a7 7 0 0 1 14 0c0 5-3 8-7 10z M12 11v10M12 11c0-2 1.5-4 4-4M12 14c0-1.5-1.2-3-3.5-3" />
    ),
  },
  {
    num: "STEP 02",
    title: "Slow cold-pressed",
    body: "Pressed without heat to keep every vitamin, enzyme and bit of flavour alive in the bottle.",
    icon: <path d="M12 2c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0C7 8.5 9 6 12 2z" />,
  },
  {
    num: "STEP 03",
    title: "Delivered cold",
    body: "Bottled, chilled and at your door within hours — so it tastes exactly like the farm intended.",
    icon: <path d="M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7 M12 11v10" />,
  },
];

export function ProcessSteps() {
  return (
    <section id="process" className="anchor-offset py-[88px]">
      <div className="max-w-wrap mx-auto px-8">
        <SectionHead
          eyebrow="How it's made"
          title="From the field to your fridge in hours"
          intro="No concentrates, no powders, no shortcuts. Just three honest steps between the farm and your glass."
          className="mb-[46px]"
        />
        <BrandFilm variant="feature" />
        <div className="grid md:grid-cols-3 gap-7">
          {steps.map((s) => (
            <div
              key={s.num}
              className="bg-paper border border-line rounded-[22px] p-8 px-7 relative overflow-hidden"
            >
              <div className="font-display text-[14px] font-bold text-carrot tracking-[.1em]">
                {s.num}
              </div>
              <div className="w-12 h-12 rounded-[14px] grid place-items-center my-[18px] bg-[rgba(47,93,52,.1)]">
                <svg
                  viewBox="0 0 24 24"
                  width={26}
                  height={26}
                  fill="none"
                  stroke="#2f5d34"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {s.icon}
                </svg>
              </div>
              <h3 className="text-[22px]">{s.title}</h3>
              <p className="text-[15px] text-ink-soft mt-2.5">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
