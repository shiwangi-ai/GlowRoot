import Image from "next/image";
import { Button, Eyebrow, ArrowRight } from "@glowroot/ui";

const trust = [
  { value: "100%", label: "Whole fruit & veg" },
  { value: "0g", label: "Added sugar" },
  { value: "6am", label: "Pressed daily" },
];

export function Hero() {
  return (
    <section className="relative py-[74px] pb-[90px]">
      <div className="max-w-wrap mx-auto px-8 grid md:grid-cols-[1.05fr_.95fr] gap-[60px] items-center">
        <div>
          <Eyebrow>Cold-pressed · Farm to bottle</Eyebrow>
          <h1 className="text-[clamp(44px,6vw,76px)] font-extrabold mt-4">
            Real fruit.
            <br />
            Real roots.
            <br />
            <em className="not-italic text-carrot">Nothing else.</em>
          </h1>
          <p className="text-[19px] text-ink-soft max-w-[480px] my-6 mb-8">
            Juices pressed from whole, seasonal fruit and vegetables — picked
            that morning, never heated, never from concentrate.
          </p>
          <div className="flex gap-3.5 flex-wrap">
            <Button href="/products" variant="primary">
              Order fresh today
              <ArrowRight />
            </Button>
            <Button href="/seasonal" variant="ghost">
              See what&apos;s in season
            </Button>
          </div>
          <div className="flex gap-[26px] mt-[38px] flex-wrap">
            {trust.map((t) => (
              <div key={t.label} className="flex flex-col">
                <b className="font-display text-[26px] text-leaf font-bold">
                  {t.value}
                </b>
                <span className="text-[13px] text-ink-soft">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center">
          <div
            className="absolute inset-[-6%_-4%_4%_-4%] blur-[2px] z-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 60% 40%, #fbe9c8, #f0d49a 60%, transparent 72%)",
            }}
          />
          <div className="relative z-[1] w-full max-w-[460px] aspect-square border border-line rounded-[26px] shadow-[0_30px_60px_-30px_rgba(40,55,25,.5)] overflow-hidden bg-paper">
            <Image
              src="/assets/bottle-red.png"
              alt="GlowRoot cold-pressed juice"
              fill
              sizes="(max-width: 900px) 92vw, 480px"
              quality={95}
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute z-[2] top-[8%] left-[-6%] bg-paper border border-line rounded-2xl px-4 py-3 shadow-float flex items-center gap-[11px]">
            <div
              className="w-[34px] h-[34px] rounded-[10px] grid place-items-center"
              style={{ background: "rgba(217,119,46,.16)" }}
            >
              <svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                fill="none"
                stroke="#d9772e"
                strokeWidth={2}
              >
                <path
                  d="M12 3c4 5 6 8 6 11a6 6 0 1 1-12 0c0-3 2-6 6-11z"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <b className="font-display text-[15px] block">Cold-pressed</b>
              <small className="block text-[12px] text-ink-soft">
                never heated
              </small>
            </div>
          </div>
          <div className="absolute z-[2] bottom-[12%] right-[-7%] bg-paper border border-line rounded-2xl px-4 py-3 shadow-float flex items-center gap-[11px]">
            <div
              className="w-[34px] h-[34px] rounded-[10px] grid place-items-center"
              style={{ background: "rgba(47,93,52,.16)" }}
            >
              <svg
                viewBox="0 0 24 24"
                width={18}
                height={18}
                fill="none"
                stroke="#2f5d34"
                strokeWidth={2}
              >
                <path
                  d="M20 6 9 17l-5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <b className="font-display text-[15px] block">Farm-fresh</b>
              <small className="block text-[12px] text-ink-soft">
                picked this morning
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
