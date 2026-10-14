"use client";

import { ModuleHeading } from "@/components/ModuleHeading";

import { useMemo, useState, useTransition } from "react";
import {
  ListViewToggle,
  useListView,
  RecordList,
  RecordRow,
  RecordCell,
} from "@/components/ui/ListView";
import { useRouter } from "next/navigation";
import type { ServiceArea, Shop } from "@glowroot/types";
import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { Toast } from "@/components/ui/Toast";
import { LocationSearch } from "@/components/locations/LocationSearch";
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  inputCls,
  labelCls,
  selectCls,
} from "@/components/ui/form";
import {
  removeLocation,
  saveLocation,
  setNationwide,
  toggleLocation,
} from "@/app/locations/actions";

type Draft = {
  pincode: string;
  area: string;
  city: string;
  state: string;
  leadDays: string;
  codEnabled: boolean;
  notes: string;
};

const emptyDraft: Draft = {
  pincode: "",
  area: "",
  city: "",
  state: "",
  leadDays: "1",
  codEnabled: true,
  notes: "",
};

function draftFrom(area: ServiceArea): Draft {
  return {
    pincode: area.pincode,
    area: area.area,
    city: area.city,
    state: area.state,
    leadDays: String(area.leadDays),
    codEnabled: area.codEnabled,
    notes: area.notes ?? "",
  };
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "carrot";
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <div className="text-[12.5px] font-medium text-ink-soft">{label}</div>
      <div
        className={`mt-1.5 font-display text-[30px] font-extrabold leading-none ${
          tone === "carrot" ? "text-carrot" : "text-leaf"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * The delivery map. Areas here are the same records the storefront reads, so
 * pausing a row stops orders from that pincode on the next page load.
 *
 * `liveOrders` counts orders still in flight per pincode; it is why pausing or
 * removing an area shows a consequence rather than a bare confirmation.
 */
export function LocationsManager({
  areas,
  shops,
  nationwide,
  liveOrders,
  canManage,
}: {
  areas: ServiceArea[];
  shops: Shop[];
  nationwide: boolean;
  liveOrders: Record<string, number>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [view, changeView] = useListView("locations");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{
    text: string;
    tone: "ok" | "error";
  } | null>(null);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editing, setEditing] = useState<ServiceArea | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const cities = useMemo(
    () => Array.from(new Set(areas.map((a) => a.city))).sort(),
    [areas],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return areas.filter((a) => {
      const matchesSearch =
        !query ||
        a.pincode.includes(query) ||
        a.area.toLowerCase().includes(query) ||
        a.city.toLowerCase().includes(query);
      const matchesCity = cityFilter === "all" || a.city === cityFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? a.active : !a.active);
      return matchesSearch && matchesCity && matchesStatus;
    });
  }, [areas, search, cityFilter, statusFilter]);

  const activeCount = areas.filter((a) => a.active).length;

  /** Every mutation funnels through here so errors surface the same way. */
  function run(
    work: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
    startTransition(async () => {
      const result = await work();
      if (result.ok) {
        setNotice({ text: success, tone: "ok" });
        router.refresh();
      } else {
        setNotice({ text: result.error, tone: "error" });
      }
    });
  }

  function openCreate() {
    setDraft(emptyDraft);
    setFormError(null);
    setCreating(true);
    setEditing(null);
  }

  function openEdit(area: ServiceArea) {
    setDraft(draftFrom(area));
    setFormError(null);
    setEditing(area);
    setCreating(false);
  }

  function closeDrawer() {
    setCreating(false);
    setEditing(null);
    setFormError(null);
  }

  function submitDraft() {
    setFormError(null);
    const id = editing?.id ?? null;
    startTransition(async () => {
      const result = await saveLocation(id, {
        pincode: draft.pincode,
        area: draft.area,
        city: draft.city,
        state: draft.state,
        leadDays: Number(draft.leadDays),
        codEnabled: draft.codEnabled,
        notes: draft.notes || undefined,
        active: editing?.active ?? true,
      });
      if (result.ok) {
        closeDrawer();
        setNotice({
          text: id
            ? "Service area updated."
            : `${draft.pincode} added to the delivery map.`,
          tone: "ok",
        });
        router.refresh();
      } else {
        setFormError(result.error);
      }
    });
  }

  const drawerOpen = creating || editing !== null;

  return (
    <div className="max-w-[1400px]">
      <Toast
        message={notice?.text ?? null}
        tone={notice?.tone}
        onDone={() => setNotice(null)}
      />

      <div className="flex flex-wrap items-start justify-between gap-5">
        <ModuleHeading
          icon="locations"
          title="Locations"
          eyebrow="Delivery network"
          description="The pincodes GlowRoot presses and delivers to. The storefront reads this map for its serviceability hint and for the hard check at checkout."
        />
        <div className="flex flex-wrap items-center gap-3">
          <ListViewToggle
            view={view}
            onChange={(next) => {
              changeView(next);
              setConfirmId(null);
            }}
            label="Locations"
            controls="locations-list"
          />
          {canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className={`${btnPrimary} shadow-float`}
            >
              + Add location
            </button>
          ) : null}
        </div>
      </div>

      {!canManage ? (
        <div className="mt-6 rounded-xl border border-line bg-cream-2/60 px-4 py-3 text-[12.5px] text-ink-soft">
          You have view-only access to the delivery map.{" "}
          <b className="text-ink">settings.manage</b> is required to change
          coverage.
        </div>
      ) : null}

      {/* Coverage mode — the switch that decides what an unknown pincode means. */}
      <section className="mt-7 rounded-2xl border border-line bg-paper p-5">
        <h2 className="font-display text-[17px]">Coverage</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          How the storefront answers a pincode that is not on the list below.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            {
              on: true,
              title: "Nationwide",
              blurb:
                "Accept any valid 6-digit pincode. Areas below add local lead times and COD rules.",
            },
            {
              on: false,
              title: "Listed areas only",
              blurb:
                "Checkout is limited to the active pincodes below. Everyone else sees the waitlist.",
            },
          ].map((option) => {
            const selected = nationwide === option.on;
            return (
              <button
                key={option.title}
                type="button"
                disabled={!canManage || pending || selected}
                onClick={() =>
                  run(
                    () => setNationwide(option.on),
                    option.on
                      ? "Now delivering to any valid pincode."
                      : "Coverage limited to the listed areas.",
                  )
                }
                className={`rounded-2xl border p-4 text-left transition-colors disabled:cursor-default ${
                  selected
                    ? "border-leaf bg-[rgba(90,138,74,.08)]"
                    : "border-line bg-cream hover:border-leaf"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full border ${
                      selected ? "border-leaf" : "border-line"
                    }`}
                  >
                    {selected ? (
                      <span className="h-2 w-2 rounded-full bg-leaf" />
                    ) : null}
                  </span>
                  <span className="text-[14px] font-semibold">
                    {option.title}
                  </span>
                  {selected ? (
                    <span className="ml-auto rounded-full bg-leaf px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white">
                      Live
                    </span>
                  ) : null}
                </span>
                <span className="mt-1.5 block pl-6 text-[12.5px] leading-snug text-ink-soft">
                  {option.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Areas on the map" value={areas.length} />
        <Stat label="Serving" value={activeCount} />
        <Stat label="Paused" value={areas.length - activeCount} tone="carrot" />
        <Stat label="Cities" value={cities.length} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-line bg-paper p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pincode, area or city…"
          className="min-w-[220px] flex-1 rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[13px] outline-none focus:border-leaf"
        />
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          aria-label="Filter by city"
          className={selectCls}
        >
          <option value="all">All cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className={selectCls}
        >
          <option value="all">All statuses</option>
          <option value="active">Serving</option>
          <option value="paused">Paused</option>
        </select>
      </div>

      <div className="mt-4">
        <RecordList
          view={view}
          id="locations-list"
          label="Locations"
          columns={[
            "Pincode",
            "Area",
            "City",
            "Stores",
            "Lead time",
            "COD",
            "Live orders",
            "Status",
            "Actions",
          ]}
          empty={
            filtered.length === 0
              ? areas.length === 0
                ? "No service areas yet — add the first pincode you deliver to."
                : "No areas match these filters."
              : undefined
          }
        >
          {filtered.map((area) => {
            const live = liveOrders[area.pincode] ?? 0;
            const confirming = confirmId === area.id;
            return (
              <RecordRow key={area.id}>
                <RecordCell
                  label="Pincode"
                  primary
                  className="px-5 py-3.5 font-semibold tabular-nums"
                >
                  {area.pincode}
                </RecordCell>
                <RecordCell label="Area" className="px-5 py-3.5">
                  {area.area}
                  {area.notes ? (
                    <span className="block max-w-[240px] truncate text-[11.5px] text-ink-soft">
                      {area.notes}
                    </span>
                  ) : null}
                </RecordCell>
                <RecordCell label="City" className="px-5 py-3.5 text-ink-soft">
                  {area.city}
                  <span className="block text-[11.5px]">{area.state}</span>
                </RecordCell>
                <RecordCell label="Stores" className="px-5 py-3.5">
                  <Link href="/stores" className="text-leaf underline">
                    {shops
                      .filter((shop) => shop.areaIds.includes(area.id))
                      .map((shop) => shop.name)
                      .join(", ") || "Unassigned"}
                  </Link>
                </RecordCell>
                <RecordCell
                  label="Lead time"
                  className="px-5 py-3.5 tabular-nums"
                >
                  {area.leadDays === 0
                    ? "Same day"
                    : area.leadDays === 1
                      ? "Next day"
                      : `${area.leadDays} days`}
                </RecordCell>
                <RecordCell label="COD" className="px-5 py-3.5 text-ink-soft">
                  {area.codEnabled ? "Yes" : "No"}
                </RecordCell>
                <RecordCell
                  label="Live orders"
                  className="px-5 py-3.5 tabular-nums"
                >
                  {live > 0 ? (
                    <b className="text-ink">{live}</b>
                  ) : (
                    <span className="text-ink-soft">—</span>
                  )}
                </RecordCell>
                <RecordCell label="Status" className="px-5 py-3.5">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                      area.active
                        ? "bg-[rgba(90,138,74,.14)] text-leaf"
                        : "bg-[rgba(217,119,46,.16)] text-carrot"
                    }`}
                  >
                    {area.active ? "Serving" : "Paused"}
                  </span>
                </RecordCell>
                <RecordCell label="Actions" className="px-5 py-3.5 text-right">
                  {!canManage ? (
                    <span className="text-[12px] text-ink-soft">—</span>
                  ) : confirming ? (
                    <span className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setConfirmId(null);
                          run(
                            () => removeLocation(area.id),
                            `${area.pincode} removed from the map.`,
                          );
                        }}
                        className={btnDanger}
                      >
                        Confirm removal
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className={btnGhost}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <span className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(area)}
                        className={btnGhost}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => toggleLocation(area.id, !area.active),
                            area.active
                              ? `${area.pincode} paused — checkout will refuse it.`
                              : `${area.pincode} is serving again.`,
                          )
                        }
                        className={btnGhost}
                      >
                        {area.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirmId(area.id)}
                        className={btnDanger}
                        title={
                          live > 0
                            ? `${live} live order(s) deliver here`
                            : undefined
                        }
                      >
                        Remove
                      </button>
                    </span>
                  )}
                </RecordCell>
              </RecordRow>
            );
          })}
        </RecordList>
      </div>

      <Drawer
        open={drawerOpen}
        eyebrow="Delivery network"
        title={editing ? `Edit ${editing.pincode}` : "Add a location"}
        subtitle={
          editing
            ? "Changes apply to the storefront on its next page load."
            : "Give the pincode a name your team recognises, and the lead time you can actually hit."
        }
        onClose={closeDrawer}
        footer={
          <>
            {editing && (liveOrders[editing.pincode] ?? 0) > 0 ? (
              <span className="mr-auto self-center text-[12px] text-ink-soft">
                {liveOrders[editing.pincode]} live order(s) deliver here.
              </span>
            ) : null}
            <button type="button" onClick={closeDrawer} className={btnGhost}>
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={submitDraft}
              className={btnPrimary}
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Add location"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-ink">
              Find with Google Maps
            </div>
            <LocationSearch
              onSelect={(location) => {
                setDraft((current) => ({
                  ...current,
                  pincode: location.pincode || current.pincode,
                  area: location.area || current.area,
                  city: location.city || current.city,
                  state: location.state || current.state,
                }));
                setFormError(null);
                setNotice({
                  text: location.formattedAddress
                    ? `Location found: ${location.formattedAddress}`
                    : "Location fields filled from Google Maps.",
                  tone: "ok",
                });
              }}
            />
            <p className="mt-1.5 text-[11.5px] text-ink-soft">
              Select a suggestion to fill the pincode, locality, city and state.
              Review the fields before saving.
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.11em] text-ink-soft">
            <span className="h-px flex-1 bg-line" />
            Location details
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Pincode
              <input
                inputMode="numeric"
                value={draft.pincode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                  })
                }
                placeholder="400050"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Area / locality
              <input
                value={draft.area}
                onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                placeholder="Bandra West"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              City
              <input
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                placeholder="Mumbai"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              State
              <input
                value={draft.state}
                onChange={(e) => setDraft({ ...draft, state: e.target.value })}
                placeholder="Maharashtra"
                className={inputCls}
              />
            </label>
          </div>

          <label className={labelCls}>
            Press-and-deliver lead time
            <select
              value={draft.leadDays}
              onChange={(e) => setDraft({ ...draft, leadDays: e.target.value })}
              className={`${inputCls} appearance-none`}
            >
              <option value="0">Same day</option>
              <option value="1">Next day</option>
              <option value="2">2 days</option>
              <option value="3">3 days</option>
            </select>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-cream p-3.5">
            <input
              type="checkbox"
              checked={draft.codEnabled}
              onChange={(e) =>
                setDraft({ ...draft, codEnabled: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 accent-leaf"
            />
            <span>
              <span className="block text-[13px] font-semibold">
                Cash on delivery
              </span>
              <span className="mt-0.5 block text-[12px] text-ink-soft">
                Riders collect at the door in this area.
              </span>
            </span>
          </label>

          <label className={labelCls}>
            Notes <span className="font-normal text-ink-soft">(optional)</span>
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Society gate closes 9pm"
              className={inputCls}
            />
          </label>

          {formError ? (
            <p className="rounded-xl border border-carrot/40 bg-carrot/[.08] px-3.5 py-2.5 text-[12.5px] text-carrot">
              {formError}
            </p>
          ) : null}
        </div>
      </Drawer>
    </div>
  );
}
