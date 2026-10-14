export type Stat = { value: string; label: string };

/** The dark benefits band with a headline and a 4-up stat grid (`.band`). */
export function StatsBand({
  heading,
  intro,
  stats,
  id,
}: {
  heading: string;
  intro?: string;
  stats: Stat[];
  id?: string;
}) {
  return (
    <section
      id={id}
      className="bg-leaf-deep text-[#f3ecd8] relative overflow-hidden"
    >
      <div className="max-w-wrap mx-auto px-8 py-[70px] relative z-[1]">
        <div className="flex justify-between items-end gap-[30px] flex-wrap mb-[42px]">
          <h2 className="text-white text-[clamp(30px,4vw,44px)] max-w-[560px] font-display font-bold leading-[1.04] tracking-[-0.02em]">
            {heading}
          </h2>
          {intro ? (
            <p className="text-[#c9d6bd] max-w-[360px]">{intro}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-7">
          {stats.map((s) => (
            <div
              key={s.label}
              className="border-t-2 border-white/[.18] pt-[18px]"
            >
              <b className="font-display text-[clamp(38px,5vw,56px)] font-extrabold text-gold block leading-none">
                {s.value}
              </b>
              <span className="block mt-[10px] text-sm text-[#cdd9c2]">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
