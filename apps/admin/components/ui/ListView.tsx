"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ListView = "table" | "cards";

export function useListView(
  module: string,
  desktopDefault: ListView = "table",
) {
  const [view, setView] = useState<ListView>("cards");
  const key = `glowroot:${module}:view`;
  useEffect(() => {
    let initial: ListView = window.matchMedia("(min-width: 768px)").matches
      ? desktopDefault
      : "cards";
    try {
      const saved = window.localStorage.getItem(key);
      if (saved === "table" || saved === "cards") initial = saved;
    } catch {
      /* The switch also works without browser storage. */
    }
    setView(initial);
  }, [key, desktopDefault]);
  function changeView(next: ListView) {
    setView(next);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      /* Keep the choice for this visit. */
    }
  }
  return [view, changeView] as const;
}

export function ListViewToggle({
  view,
  onChange,
  label,
  controls,
}: {
  view: ListView;
  onChange: (view: ListView) => void;
  label: string;
  controls: string;
}) {
  return (
    <div
      role="group"
      aria-label={`${label} list view`}
      className="inline-flex shrink-0 rounded-full border border-line bg-paper p-1"
    >
      {(["table", "cards"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={view === mode}
          aria-controls={controls}
          onClick={() => onChange(mode)}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf ${view === mode ? "bg-leaf text-paper" : "text-ink-soft hover:bg-cream"}`}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {mode === "table" ? (
              <>
                <rect x="2" y="3" width="16" height="14" rx="2" />
                <path d="M2 8h16M2 12.5h16M8 8v9" />
              </>
            ) : (
              <>
                <rect x="2" y="2" width="6" height="6" rx="1" />
                <rect x="12" y="2" width="6" height="6" rx="1" />
                <rect x="2" y="12" width="6" height="6" rx="1" />
                <rect x="12" y="12" width="6" height="6" rx="1" />
              </>
            )}
          </svg>
          {mode === "table" ? "Table" : "Cards"}
        </button>
      ))}
    </div>
  );
}

const ViewContext = createContext<ListView>("table");

// Share each record's fields and actions between layouts so their behavior stays identical.
export function RecordList({
  view,
  id,
  label,
  columns,
  children,
  empty,
}: {
  view: ListView;
  id: string;
  label: string;
  columns: string[];
  children: ReactNode;
  empty?: string;
}) {
  return (
    <ViewContext.Provider value={view}>
      <div id={id}>
        {empty ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center text-sm text-ink-soft">
            {empty}
          </div>
        ) : view === "table" ? (
          <div
            role="region"
            aria-label={`${label} table`}
            tabIndex={0}
            className="overflow-x-auto rounded-2xl border border-line bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf"
          >
            <table
              className="w-full text-left text-sm"
              style={{ minWidth: columns.length * 135 }}
            >
              <caption className="sr-only">{label}</caption>
              <thead className="border-b border-line bg-cream text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className={`px-5 py-4 ${column === "Actions" ? "text-right" : ""}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">{children}</tbody>
            </table>
          </div>
        ) : (
          <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
            {children}
          </div>
        )}
      </div>
    </ViewContext.Provider>
  );
}

export function RecordRow({ children }: { children: ReactNode }) {
  const view = useContext(ViewContext);
  return view === "table" ? (
    <tr className="align-top hover:bg-cream/40">{children}</tr>
  ) : (
    <article className="grid min-w-0 grid-cols-2 gap-4 rounded-2xl border border-line bg-paper p-5">
      {children}
    </article>
  );
}

export function RecordCell({
  label,
  primary,
  className = "",
  children,
}: {
  label: string;
  primary?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const view = useContext(ViewContext);
  if (view === "table")
    return primary ? (
      <th scope="row" className={className}>
        {children}
      </th>
    ) : (
      <td className={className}>{children}</td>
    );
  const actions = label === "Actions";
  return (
    <div
      className={`relative min-w-0 break-words text-sm ${primary ? "col-span-2 border-b border-line pb-4 font-semibold" : actions ? "col-span-2 border-t border-line pt-4 text-right" : ""}`}
    >
      {!primary && !actions && (
        <p className="mb-1 text-xs font-medium text-ink-soft">{label}</p>
      )}
      {children}
    </div>
  );
}

export function ListViewSection({
  module,
  label,
  columns,
  children,
  empty,
  heading,
}: {
  module: string;
  label: string;
  columns: string[];
  children: ReactNode;
  empty?: string;
  heading: ReactNode;
}) {
  const [view, changeView] = useListView(module);
  return (
    <section>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>{heading}</div>
        <ListViewToggle
          view={view}
          onChange={changeView}
          label={label}
          controls={`${module}-list`}
        />
      </header>
      <RecordList
        view={view}
        id={`${module}-list`}
        label={label}
        columns={columns}
        empty={empty}
      >
        {children}
      </RecordList>
    </section>
  );
}
