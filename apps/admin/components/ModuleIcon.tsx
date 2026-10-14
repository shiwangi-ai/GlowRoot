const paths = {
  customers: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2",
  dashboard: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  orders: "M8 4H5v17h14V4h-3 M8 3h8v4H8z M8 12h8 M8 16h5",
  products:
    "M9 3h6v4H9z M9 7v2l-2 3v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8l-2-3V7 M7 14h10 M7 18h10",
  materials: "m12 3 9 5-9 5-9-5 9-5z M3 8v9l9 5 9-5V8 M12 13v9 M7.5 5.5l9 5",
  delivery:
    "M3 5h11v12H3z M14 9h4l3 4v4h-7 M14 13h7 M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  locations:
    "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  stores:
    "M3 9l2-6h14l2 6 M3 9v2a3 3 0 0 0 6 0V9 M9 9v2a3 3 0 0 0 6 0V9 M15 9v2a3 3 0 0 0 6 0V9H3 M5 14v7h14v-7 M9 21v-5h6v5",
  staff:
    "M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M2 21v-2a6 6 0 0 1 12 0v2 M17 4a4 4 0 0 1 0 8 M18 15a5 5 0 0 1 4 5v1",
} as const;

export type ModuleIconName = keyof typeof paths;

/** Decorative icons inherit the navigation link's active and hover colours. */
export function ModuleIcon({ name }: { name: ModuleIconName }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
