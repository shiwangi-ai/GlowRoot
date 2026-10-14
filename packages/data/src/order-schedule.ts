/** Add one delivery day while keeping the stored time/offset or date-only form. */
export function nextDeliveryDate(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})(T.*)?$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return null;
  const date = new Date(`${match[1]}T00:00:00Z`);
  if (date.toISOString().slice(0, 10) !== match[1]) return null;
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10) + (match[2] ?? "");
}

/** Rescheduling postpones this delivery; the existing time and slot are retained. */
export function rescheduledDeliveryDate(
  current: string,
  selected: string,
): string | null {
  if (
    !nextDeliveryDate(current) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(selected) ||
    !nextDeliveryDate(selected)
  )
    return null;
  if (selected <= current.slice(0, 10)) return null;
  return selected + current.slice(10);
}

export function deliveryToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
