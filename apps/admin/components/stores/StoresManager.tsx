"use client";

import { ListViewToggle, useListView } from "@/components/ui/ListView";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Shop, ServiceArea } from "@glowroot/types";
import { saveStore } from "@/app/stores/actions";
import { Drawer } from "@/components/ui/Drawer";
import { ModuleHeading } from "@/components/ModuleHeading";
import { btnPrimary, btnGhost, inputCls, labelCls } from "@/components/ui/form";

// These operations do not yet have store-specific data in the Shop model.
const operationColumns = [
  "Manager",
  "Staff",
  "Delivery partners",
  "Pickup point",
  "Delivery radius",
  "Delivery target",
  "Menu & availability",
  "Opening hours",
  "Order status",
  "Orders",
] as const;

const selectableColumns = ["Location", "Address", "Phone", ...operationColumns];
const defaultColumns = ["Location", "Phone", "Order status"];
const columnPresets = {
  "Basic details": ["Location", "Address", "Phone"],
  Operations: [
    "Manager",
    "Staff",
    "Delivery partners",
    "Opening hours",
    "Order status",
    "Orders",
  ],
  "All columns": selectableColumns,
};

const empty = {
  name: "",
  address: "",
  city: "",
  pincode: "",
  phone: "",
  areaIds: [] as string[],
};

export function StoresManager({
  shops,
  areas,
  canManage,
}: {
  shops: Shop[];
  areas: ServiceArea[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState<string[]>(defaultColumns);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const columnsPanel = useRef<HTMLDivElement>(null);
  const columnsButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(
        window.localStorage.getItem("glowroot:stores:columns") ?? "null",
      );
      if (
        Array.isArray(saved) &&
        saved.every((item) => typeof item === "string")
      )
        setColumns(
          selectableColumns.filter((column) => saved.includes(column)),
        );
    } catch {
      /* Invalid or unavailable storage uses the default columns. */
    }
  }, []);
  useEffect(() => {
    if (!columnsOpen) return;
    function dismiss(event: PointerEvent) {
      if (!columnsPanel.current?.contains(event.target as Node))
        setColumnsOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setColumnsOpen(false);
        columnsButton.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [columnsOpen]);
  function chooseColumns(next: string[]) {
    setColumns(next);
    try {
      window.localStorage.setItem(
        "glowroot:stores:columns",
        JSON.stringify(next),
      );
    } catch {
      /* Keep this visit's choices. */
    }
  }
  const visibleOperations = operationColumns.filter((column) =>
    columns.includes(column),
  );
  const query = search.trim().toLowerCase();
  const filteredShops = shops.filter((shop) =>
    [
      shop.name,
      shop.address,
      shop.city,
      shop.pincode,
      shop.phone,
      ...areas
        .filter((area) => shop.areaIds.includes(area.id))
        .map((area) => area.area),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
  const [view, changeView] = useListView("stores");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(empty);
  const [error, setError] = useState("");
  const [locationNotice, setLocationNotice] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const unassigned = areas.filter(
    (area) => !shops.some((shop) => shop.areaIds.includes(area.id)),
  );
  function edit(shop?: Shop) {
    setEditing(shop?.id ?? null);
    setDraft(
      shop
        ? {
            ...shop,
            areaIds: shop.areaIds.filter((id) =>
              areas.some((area) => area.id === id),
            ),
          }
        : { ...empty, areaIds: [] },
    );
    setError("");
    setLocationNotice("");
    setOpen(true);
  }
  function fillFromLocation(id: string) {
    const area = areas.find((item) => item.id === id);
    if (!area) {
      setDraft((current) => ({ ...current, areaIds: [] }));
      setLocationNotice("");
      return;
    }
    setDraft((current) => ({
      ...current,
      city: area.city,
      pincode: area.pincode,
      areaIds: [id],
    }));
    setLocationNotice(
      `City and pincode filled from ${area.area}, ${area.state}. Enter the shop’s exact street address below. The saved location is unchanged.`,
    );
  }
  function submit() {
    if (pending) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await saveStore(editing, draft);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setOpen(false);
        setNotice("Store and location assignments saved.");
        router.refresh();
      } catch {
        setError("Could not reach the server. Try saving again.");
      }
    });
  }
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-5">
        <ModuleHeading
          icon="stores"
          title="Stores"
          description="Manage your shops and their locations."
        />
        <div className="flex flex-wrap items-center gap-3">
          <ListViewToggle
            view={view}
            onChange={(next) => {
              changeView(next);
              setColumnsOpen(false);
            }}
            label="Store"
            controls="store-list"
          />
          {canManage && (
            <button type="button" className={btnPrimary} onClick={() => edit()}>
              + Add store
            </button>
          )}
        </div>
      </header>
      {notice && (
        <p role="status" className="mt-4 text-leaf">
          {notice}
        </p>
      )}
      <div className="mb-4 mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper p-4">
        <label className="min-w-[180px] flex-1">
          <span className="sr-only">Search stores</span>
          <input
            type="search"
            className={`${inputCls} !mt-0`}
            placeholder="Search stores, locations or phone…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        {view === "table" && (
          <div ref={columnsPanel} className="relative">
            <button
              ref={columnsButton}
              type="button"
              aria-label="Column settings"
              aria-expanded={columnsOpen}
              aria-controls="store-columns-panel"
              onClick={() => setColumnsOpen(!columnsOpen)}
              className={`inline-flex min-h-11 items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 ${columnsOpen ? "border-leaf bg-leaf text-paper" : "border-line bg-paper text-ink hover:border-leaf/50 hover:bg-cream hover:text-leaf"}`}
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4 shrink-0"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2.5" y="3" width="15" height="14" rx="2" />
                <path d="M7.5 3v14M12.5 3v14" />
              </svg>
              <span>Columns</span>
              <svg
                aria-hidden="true"
                className={`h-3.5 w-3.5 shrink-0 transition-transform motion-reduce:transition-none ${columnsOpen ? "rotate-180" : ""}`}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            {columnsOpen && (
              <section
                id="store-columns-panel"
                aria-label="Choose store columns"
                className="absolute right-0 top-full z-30 mt-2 w-[min(320px,calc(100vw-48px))] rounded-2xl border border-line bg-paper p-4 shadow-pop"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Visible columns</h2>
                  <button
                    type="button"
                    aria-label="Close column settings"
                    className="rounded px-2 py-1 text-lg"
                    onClick={() => {
                      setColumnsOpen(false);
                      columnsButton.current?.focus();
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="my-3 flex flex-wrap gap-2">
                  {Object.entries(columnPresets).map(([label, values]) => (
                    <button
                      key={label}
                      type="button"
                      className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-cream"
                      onClick={() => chooseColumns(values)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  <label className="flex items-center gap-3 py-2 text-sm text-ink-soft">
                    <input type="checkbox" checked disabled />
                    Store name · Always visible
                  </label>
                  {selectableColumns.map((column) => (
                    <label
                      key={column}
                      className="flex cursor-pointer items-center gap-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={columns.includes(column)}
                        onChange={(event) =>
                          chooseColumns(
                            event.target.checked
                              ? [...columns, column]
                              : columns.filter((item) => item !== column),
                          )
                        }
                      />
                      {column}
                    </label>
                  ))}
                  {canManage && (
                    <label className="flex items-center gap-3 py-2 text-sm text-ink-soft">
                      <input type="checkbox" checked disabled />
                      Actions · Always visible
                    </label>
                  )}
                </div>
                <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
                  Your choices are saved in this browser.
                </p>
              </section>
            )}
          </div>
        )}
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            setSearch("");
            chooseColumns(defaultColumns);
            setColumnsOpen(false);
          }}
        >
          Reset view
        </button>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        <p role="status">
          Showing {filteredShops.length} of {shops.length} stores
        </p>
        <Link className="font-semibold text-leaf underline" href="/locations">
          {unassigned.length} locations unassigned
        </Link>
      </div>
      <div id="store-list">
        {shops.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center">
            <h2 className="text-2xl">Add your first store</h2>
            <p className="mx-auto my-4 max-w-md text-ink-soft">
              Create a shop with its address, then select one existing location.
            </p>
            {canManage ? (
              <button className={btnPrimary} onClick={() => edit()}>
                Create store
              </button>
            ) : (
              <p>Ask an administrator with settings access to add a store.</p>
            )}
          </section>
        ) : filteredShops.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-line p-10 text-center">
            <h2 className="text-xl">No matching stores</h2>
            <p className="my-3 text-sm text-ink-soft">
              Try another name, location or phone number.
            </p>
            <button
              type="button"
              className={btnGhost}
              onClick={() => setSearch("")}
            >
              Clear search
            </button>
          </section>
        ) : view === "table" ? (
          <>
            <p id="store-table-help" className="mb-3 text-xs text-ink-soft">
              “-” indicates unavailable information. Use Columns to choose the
              details shown.
            </p>
            <div
              aria-describedby="store-table-help"
              role="region"
              aria-label="Stores table"
              tabIndex={0}
              className="overflow-x-auto rounded-2xl border border-line bg-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-leaf"
            >
              <table
                className="w-full text-left text-sm"
                style={{
                  minWidth: 220 + columns.length * 150 + (canManage ? 150 : 0),
                }}
              >
                <caption className="sr-only">
                  Stores and their assigned locations
                </caption>
                <thead className="border-b border-line bg-cream text-xs uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-10 min-w-[220px] border-r border-line bg-cream px-5 py-4"
                    >
                      Store name
                    </th>
                    {columns.includes("Location") && (
                      <th scope="col" className="px-5 py-4">
                        Location
                      </th>
                    )}
                    {columns.includes("Address") && (
                      <th scope="col" className="px-5 py-4">
                        Address
                      </th>
                    )}
                    {columns.includes("Phone") && (
                      <th scope="col" className="px-5 py-4 text-center">
                        Phone
                      </th>
                    )}
                    {visibleOperations.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="min-w-[150px] px-5 py-4 text-center"
                      >
                        {column}
                      </th>
                    ))}
                    {canManage && (
                      <th
                        scope="col"
                        className="sticky right-0 z-10 border-l border-line bg-cream px-5 py-4 text-right"
                      >
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredShops.map((shop) => {
                    const assigned = areas.filter((area) =>
                      shop.areaIds.includes(area.id),
                    );
                    return (
                      <tr key={shop.id} className="align-top hover:bg-cream/40">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 max-w-xs break-words border-r border-line bg-paper px-5 py-5 font-semibold"
                        >
                          {shop.name}
                        </th>
                        {columns.includes("Location") && (
                          <td className="px-5 py-5">
                            <div className="flex flex-col gap-2">
                              {assigned.map((area) => (
                                <span key={area.id}>
                                  {area.area}
                                  <span className="block text-xs text-ink-soft">
                                    {area.pincode}
                                    {!area.active && " · Paused"}
                                  </span>
                                </span>
                              ))}
                              {assigned.length === 0 && (
                                <span className="text-ink-soft">
                                  No location assigned
                                </span>
                              )}
                              {shop.areaIds.length > 1 && (
                                <span className="text-xs text-carrot">
                                  Multiple locations assigned. Edit to choose
                                  one.
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {columns.includes("Address") && (
                          <td className="max-w-sm break-words px-5 py-5 text-ink-soft">
                            {shop.address}
                            <span className="mt-1 block">
                              {shop.city} · {shop.pincode}
                            </span>
                          </td>
                        )}
                        {columns.includes("Phone") && (
                          <td className="whitespace-nowrap px-5 py-5 text-center">
                            {shop.phone || (
                              <span className="text-ink-soft">-</span>
                            )}
                          </td>
                        )}
                        {visibleOperations.map((column) => (
                          <td
                            key={column}
                            className="px-5 py-5 text-center text-ink-soft"
                          >
                            -
                          </td>
                        ))}
                        {canManage && (
                          <td className="sticky right-0 z-10 border-l border-line bg-paper px-5 py-5 text-right">
                            <button
                              type="button"
                              aria-label={`Edit ${shop.name}`}
                              className={`${btnGhost} whitespace-nowrap`}
                              onClick={() => edit(shop)}
                            >
                              Edit store
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {filteredShops.map((shop) => {
              const assigned = areas.filter((area) =>
                shop.areaIds.includes(area.id),
              );
              return (
                <article
                  key={shop.id}
                  className="rounded-2xl border border-line bg-paper p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-leaf">
                        {shop.city}
                      </p>
                      <h2 className="mt-1 text-2xl">{shop.name}</h2>
                    </div>
                    {canManage && (
                      <button className={btnGhost} onClick={() => edit(shop)}>
                        Edit store
                      </button>
                    )}
                  </div>
                  <p className="mt-4 text-sm text-ink-soft">
                    {shop.address} · {shop.city} · {shop.pincode}
                  </p>
                  {shop.phone && <p className="mt-1 text-sm">{shop.phone}</p>}
                  <div className="mt-5 border-t border-line pt-4">
                    <h3 className="text-sm font-semibold">Store location</h3>
                    {shop.areaIds.length > 1 && (
                      <p className="mt-2 text-sm text-carrot">
                        Multiple locations assigned. Edit this store to choose
                        one.
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {assigned.map((area) => (
                        <span
                          className="rounded-lg bg-cream px-3 py-2 text-xs"
                          key={area.id}
                        >
                          {area.area} · {area.pincode}
                          {!area.active && " · Paused"}
                        </span>
                      ))}
                      {assigned.length === 0 && (
                        <p className="text-sm text-ink-soft">
                          No location assigned yet.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <Drawer
        open={open}
        eyebrow="Store details"
        title={editing ? "Edit store" : "Create store"}
        subtitle="Assign one existing location to this physical shop."
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        footer={
          <>
            <button
              disabled={pending}
              className={btnGhost}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              form="store-form"
              type="submit"
              disabled={pending}
              className={btnPrimary}
            >
              {pending ? "Saving…" : "Save store"}
            </button>
          </>
        }
      >
        <form
          id="store-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          <fieldset disabled={pending} className="space-y-4">
            <label className={labelCls}>
              Store location
              <select
                className={inputCls}
                required
                value={draft.areaIds.length === 1 ? draft.areaIds[0] : ""}
                onChange={(event) => fillFromLocation(event.target.value)}
              >
                <option value="">Choose one location</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.area} · {area.city} · {area.pincode}
                    {!area.active ? " · Paused" : ""}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-ink-soft">
                Choose exactly one location. Changing it replaces the previous
                assignment and fills city and pincode. Other store details stay
                as entered.
              </span>
            </label>
            {draft.areaIds.length > 1 && (
              <p role="alert" className="text-sm text-carrot">
                This store has multiple locations from an earlier setup. Choose
                the one location to keep before saving.
              </p>
            )}
            {areas.length === 0 && (
              <p className="text-sm">
                Add a location in Locations before saving a store.
              </p>
            )}
            {locationNotice && (
              <p
                role="status"
                className="rounded-xl bg-cream p-3 text-sm text-leaf"
              >
                {locationNotice}
              </p>
            )}
            {(
              [
                ["name", "Store name"],
                ["address", "Street address"],
                ["city", "City"],
                ["pincode", "Store pincode"],
                ["phone", "Contact phone (optional)"],
              ] as const
            ).map(([key, label]) => (
              <label className={labelCls} key={key}>
                {label}
                <input
                  required={key !== "phone"}
                  maxLength={
                    key === "pincode"
                      ? 6
                      : key === "address"
                        ? 300
                        : key === "phone"
                          ? 24
                          : 100
                  }
                  inputMode={
                    key === "pincode"
                      ? "numeric"
                      : key === "phone"
                        ? "tel"
                        : "text"
                  }
                  className={inputCls}
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft({ ...draft, [key]: event.target.value })
                  }
                />
              </label>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-carrot">
              {error}
            </p>
          )}
        </form>
      </Drawer>
    </>
  );
}
