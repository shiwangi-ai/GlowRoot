import type { OrderStatus } from "@glowroot/types";
import { humanize } from "@glowroot/utils";

const styles: Record<OrderStatus, string> = {
  pending: "bg-cream-2 text-ink-soft",
  confirmed: "bg-[rgba(90,138,74,.14)] text-leaf",
  pressing: "bg-[rgba(232,178,63,.2)] text-[#8a6a12]",
  "out-for-delivery": "bg-[rgba(217,119,46,.16)] text-carrot",
  delivered: "bg-[rgba(47,93,52,.14)] text-leaf-deep",
  cancelled: "bg-[rgba(212,83,58,.14)] text-apple",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block text-[12px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${styles[status]}`}
    >
      {humanize(status)}
    </span>
  );
}
