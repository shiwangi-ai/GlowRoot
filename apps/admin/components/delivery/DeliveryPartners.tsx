"use client";

import { ModuleHeading } from "@/components/ModuleHeading";

import { DeliveryOrderMap, type DeliveryStop } from "./DeliveryOrderMap";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ListViewToggle,
  useListView,
  RecordList,
  RecordRow,
  RecordCell,
} from "@/components/ui/ListView";
import { useRouter } from "next/navigation";
import type {
  DeliveryPartner,
  DeliveryPartnerStatus,
  ServiceArea,
  VehicleType,
} from "@glowroot/types";
import { formatDate, humanize } from "@glowroot/utils";
import { Drawer } from "@/components/ui/Drawer";
import { Toast } from "@/components/ui/Toast";
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  inputCls,
  labelCls,
  selectCls,
} from "@/components/ui/form";
import {
  changePartnerStatus,
  removePartner,
  savePartner,
} from "@/app/delivery/actions";
import { assignPartner } from "@/app/orders/actions";

export type PartnerRow = {
  partner: DeliveryPartner;
  activeOrders: number;
  onRoad: number;
  delivered: number;
};

export type UnassignedOrder = {
  id: string;
  customerName: string;
  pincode: string;
  area: string | null;
  deliveryDate: string;
  status: string;
};

const statusStyle: Record<DeliveryPartnerStatus, string> = {
  available: "bg-[rgba(90,138,74,.14)] text-leaf",
  "on-route": "bg-[rgba(232,178,63,.2)] text-[#8a6410]",
  "off-duty": "bg-cream-2 text-ink-soft",
  inactive: "bg-[rgba(217,119,46,.16)] text-carrot",
};

const vehicles: VehicleType[] = ["cycle", "bike", "scooter", "van"];
const statuses: DeliveryPartnerStatus[] = [
  "available",
  "on-route",
  "off-duty",
  "inactive",
];

type Draft = {
  name: string;
  phone: string;
  vehicle: VehicleType;
  vehicleNumber: string;
  zones: string[];
  capacityPerSlot: string;
  status: DeliveryPartnerStatus;
  notes: string;
};

const emptyDraft: Draft = {
  name: "",
  phone: "",
  vehicle: "bike",
  vehicleNumber: "",
  zones: [],
  capacityPerSlot: "10",
  status: "available",
  notes: "",
};

function draftFrom(p: DeliveryPartner): Draft {
  return {
    name: p.name,
    phone: p.phone,
    vehicle: p.vehicle,
    vehicleNumber: p.vehicleNumber ?? "",
    zones: p.zones,
    capacityPerSlot: String(p.capacityPerSlot),
    status: p.status,
    notes: p.notes ?? "",
  };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
 * The delivery roster and today's dispatch queue.
 *
 * Partners are matched to orders by pincode: the assign control offers whoever
 * covers that pincode first, then everyone else, because dispatch overrides a
 * zone often enough that hiding the rest would be unhelpful.
 */
export function DeliveryPartners({
  rows,
  areas,
  unassigned,
  stops,
  canViewCustomers,
  canManage,
}: {
  rows: PartnerRow[];
  areas: ServiceArea[];
  unassigned: UnassignedOrder[];
  stops: DeliveryStop[];
  canViewCustomers: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [view, changeView] = useListView("delivery");
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{
    text: string;
    tone: "ok" | "error";
  } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<DeliveryPartner | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [extraZone, setExtraZone] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [assignChoice, setAssignChoice] = useState<Record<string, string>>({});

  const zones = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.partner.zones))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(({ partner }) => {
      const matchesSearch =
        !query ||
        partner.name.toLowerCase().includes(query) ||
        partner.phone.includes(query) ||
        partner.id.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || partner.status === statusFilter;
      const matchesZone =
        zoneFilter === "all" || partner.zones.includes(zoneFilter);
      return matchesSearch && matchesStatus && matchesZone;
    });
  }, [rows, search, statusFilter, zoneFilter]);

  const onRoster = rows.filter((r) => r.partner.status !== "inactive").length;
  const availableNow = rows.filter(
    (r) => r.partner.status === "available",
  ).length;
  const carrying = rows.reduce((sum, r) => sum + r.activeOrders, 0);

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
    setExtraZone("");
    setCreating(true);
    setEditing(null);
  }

  function openEdit(partner: DeliveryPartner) {
    setDraft(draftFrom(partner));
    setFormError(null);
    setExtraZone("");
    setEditing(partner);
    setCreating(false);
  }

  function closeDrawer() {
    setCreating(false);
    setEditing(null);
    setFormError(null);
  }

  function toggleZone(pincode: string) {
    setDraft((d) => ({
      ...d,
      zones: d.zones.includes(pincode)
        ? d.zones.filter((z) => z !== pincode)
        : [...d.zones, pincode],
    }));
  }

  function submitDraft() {
    setFormError(null);
    const id = editing?.id ?? null;
    startTransition(async () => {
      const result = await savePartner(id, {
        name: draft.name,
        phone: draft.phone,
        vehicle: draft.vehicle,
        vehicleNumber: draft.vehicleNumber || undefined,
        zones: draft.zones,
        capacityPerSlot: Number(draft.capacityPerSlot),
        status: draft.status,
        notes: draft.notes || undefined,
      });
      if (result.ok) {
        closeDrawer();
        setNotice({
          text: id
            ? "Partner details updated."
            : `${draft.name} added to the roster.`,
          tone: "ok",
        });
        router.refresh();
      } else {
        setFormError(result.error);
      }
    });
  }

  /** Partners who cover this pincode first, then the rest as an override. */
  function eligibleFor(pincode: string) {
    const active = rows.filter((r) => r.partner.status !== "inactive");
    return {
      covering: active.filter((r) => r.partner.zones.includes(pincode)),
      others: active.filter((r) => !r.partner.zones.includes(pincode)),
    };
  }

  return (
    <div className="max-w-[1400px]">
      <Toast
        message={notice?.text ?? null}
        tone={notice?.tone}
        onDone={() => setNotice(null)}
      />

      <div className="flex flex-wrap items-start justify-between gap-5">
        <ModuleHeading
          icon="delivery"
          title="Delivery partners"
          eyebrow="Fulfilment"
          description="Who is on the road, which pincodes they cover, and which orders are still waiting for someone to carry them."
        />
        <div className="flex flex-wrap items-center gap-3">
          <ListViewToggle
            view={view}
            onChange={(next) => {
              changeView(next);
              setConfirmId(null);
            }}
            label="Delivery partners"
            controls="delivery-list"
          />
          {canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className={`${btnPrimary} shadow-float`}
            >
              + Add partner
            </button>
          ) : null}
        </div>
      </div>

      {!canManage ? (
        <div className="mt-6 rounded-xl border border-line bg-cream-2/60 px-4 py-3 text-[12.5px] text-ink-soft">
          You have view-only access to the roster.{" "}
          <b className="text-ink">fulfilment.manage</b> is required to assign
          work or edit partners.
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="On the roster" value={onRoster} />
        <Stat label="Available now" value={availableNow} />
        <Stat label="Orders being carried" value={carrying} />
        <Stat
          label="Awaiting a partner"
          value={unassigned.length}
          tone="carrot"
        />
      </div>

      {canViewCustomers ? (
        <DeliveryOrderMap stops={stops} />
      ) : (
        <p className="mt-6 text-sm text-ink-soft">
          Customer delivery details are available to Super Admin and Admin only.
        </p>
      )}

      {/* Dispatch queue — the reason this screen exists on a busy morning. */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-paper">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-[17px]">Awaiting a partner</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              Live orders with nobody assigned yet.
            </p>
          </div>
          <Link
            href="/orders"
            className="text-[13px] text-leaf hover:underline"
          >
            All orders →
          </Link>
        </div>

        {unassigned.length === 0 ? (
          <div className="p-8 text-center text-[14px] text-ink-soft">
            Every live order has a delivery partner.
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {unassigned.map((order) => {
              const { covering, others } = eligibleFor(order.pincode);
              const choice =
                assignChoice[order.id] ?? covering[0]?.partner.id ?? "";
              return (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-[200px] flex-1">
                    <Link
                      href={`/orders/${order.id}`}
                      className="font-semibold text-leaf hover:underline"
                    >
                      {order.id}
                    </Link>
                    <span className="ml-2 text-[13px]">
                      {order.customerName}
                    </span>
                    <div className="mt-0.5 text-[12px] text-ink-soft">
                      {order.pincode
                        ? `${order.pincode} · ${order.area ?? "not on the delivery map"}`
                        : "No pincode on file"}{" "}
                      · {formatDate(order.deliveryDate)} ·{" "}
                      {humanize(order.status)}
                    </div>
                  </div>

                  {canManage ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={choice}
                        aria-label={`Assign a partner to ${order.id}`}
                        onChange={(e) =>
                          setAssignChoice((c) => ({
                            ...c,
                            [order.id]: e.target.value,
                          }))
                        }
                        className={selectCls}
                      >
                        <option value="">Choose a partner…</option>
                        {covering.length ? (
                          <optgroup label={`Covers ${order.pincode}`}>
                            {covering.map((r) => (
                              <option key={r.partner.id} value={r.partner.id}>
                                {r.partner.name} · {r.activeOrders}/
                                {r.partner.capacityPerSlot}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                        {others.length ? (
                          <optgroup label="Other partners (out of zone)">
                            {others.map((r) => (
                              <option key={r.partner.id} value={r.partner.id}>
                                {r.partner.name} · {r.activeOrders}/
                                {r.partner.capacityPerSlot}
                              </option>
                            ))}
                          </optgroup>
                        ) : null}
                      </select>
                      <button
                        type="button"
                        disabled={pending || !choice}
                        onClick={() =>
                          run(
                            () => assignPartner(order.id, choice),
                            `${order.id} assigned.`,
                          )
                        }
                        className={btnPrimary}
                      >
                        Assign
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-line bg-paper p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone or partner ID…"
          className="min-w-[220px] flex-1 rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[13px] outline-none focus:border-leaf"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className={selectCls}
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </select>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          aria-label="Filter by zone"
          className={selectCls}
        >
          <option value="all">All zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <RecordList
          view={view}
          id="delivery-list"
          label="Delivery partners"
          columns={[
            "Partner",
            "Vehicle",
            "Zones",
            "Load",
            "Delivered",
            "Status",
            "Actions",
          ]}
          empty={
            filtered.length === 0
              ? rows.length === 0
                ? "Nobody on the roster yet — add your first delivery partner."
                : "No partners match these filters."
              : undefined
          }
        >
          {filtered.map(({ partner, activeOrders, onRoad, delivered }) => {
            const full = activeOrders >= partner.capacityPerSlot;
            const confirming = confirmId === partner.id;
            return (
              <RecordRow key={partner.id}>
                <RecordCell label="Partner" primary className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(90,138,74,.14)] text-[11px] font-bold text-leaf">
                      {initials(partner.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">
                        {partner.name}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-soft">
                        {partner.id} · {partner.phone}
                      </span>
                    </span>
                  </div>
                </RecordCell>
                <RecordCell
                  label="Vehicle"
                  className="px-5 py-3.5 text-ink-soft"
                >
                  {humanize(partner.vehicle)}
                  {partner.vehicleNumber ? (
                    <span className="block text-[11.5px]">
                      {partner.vehicleNumber}
                    </span>
                  ) : null}
                </RecordCell>
                <RecordCell label="Zones" className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    {partner.zones.slice(0, 3).map((z) => (
                      <span
                        key={z}
                        className="rounded-full border border-line bg-cream px-2 py-0.5 text-[11.5px] font-semibold tabular-nums"
                      >
                        {z}
                      </span>
                    ))}
                    {partner.zones.length > 3 ? (
                      <span className="rounded-full bg-cream-2 px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">
                        +{partner.zones.length - 3}
                      </span>
                    ) : null}
                  </div>
                </RecordCell>
                <RecordCell label="Load" className="px-5 py-3.5 tabular-nums">
                  <span className={full ? "font-semibold text-carrot" : ""}>
                    {activeOrders}/{partner.capacityPerSlot}
                  </span>
                  {onRoad > 0 ? (
                    <span className="block text-[11.5px] text-ink-soft">
                      {onRoad} on the road
                    </span>
                  ) : null}
                </RecordCell>
                <RecordCell
                  label="Delivered"
                  className="px-5 py-3.5 tabular-nums text-ink-soft"
                >
                  {delivered}
                </RecordCell>
                <RecordCell label="Status" className="px-5 py-3.5">
                  {canManage ? (
                    <select
                      value={partner.status}
                      disabled={pending}
                      aria-label={`Status for ${partner.name}`}
                      onChange={(e) =>
                        run(
                          () =>
                            changePartnerStatus(
                              partner.id,
                              e.target.value as DeliveryPartnerStatus,
                            ),
                          `${partner.name} is now ${humanize(e.target.value)}.`,
                        )
                      }
                      className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold outline-none ${statusStyle[partner.status]}`}
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>
                          {humanize(s)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${statusStyle[partner.status]}`}
                    >
                      {humanize(partner.status)}
                    </span>
                  )}
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
                            () => removePartner(partner.id),
                            `${partner.name} removed from the roster.`,
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
                        onClick={() => openEdit(partner)}
                        className={btnGhost}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirmId(partner.id)}
                        className={btnDanger}
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
        open={creating || editing !== null}
        eyebrow="Fulfilment"
        title={editing ? `Edit ${editing.name}` : "Add a delivery partner"}
        subtitle={
          editing
            ? "Zones decide which orders they are offered first."
            : "Zones decide which orders they are offered first; capacity is per delivery slot."
        }
        onClose={closeDrawer}
        footer={
          <>
            <button type="button" onClick={closeDrawer} className={btnGhost}>
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={submitDraft}
              className={btnPrimary}
            >
              {pending ? "Saving…" : editing ? "Save changes" : "Add partner"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelCls}>
              Full name
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Imran Qureshi"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Phone
              <input
                inputMode="numeric"
                value={draft.phone}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                placeholder="9820011223"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Vehicle
              <select
                value={draft.vehicle}
                onChange={(e) =>
                  setDraft({ ...draft, vehicle: e.target.value as VehicleType })
                }
                className={`${inputCls} appearance-none`}
              >
                {vehicles.map((v) => (
                  <option key={v} value={v}>
                    {humanize(v)}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelCls}>
              Vehicle number{" "}
              <span className="font-normal text-ink-soft">(optional)</span>
              <input
                value={draft.vehicleNumber}
                onChange={(e) =>
                  setDraft({ ...draft, vehicleNumber: e.target.value })
                }
                placeholder="MH 02 CJ 4417"
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Capacity per slot
              <input
                inputMode="numeric"
                value={draft.capacityPerSlot}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    capacityPerSlot: e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 2),
                  })
                }
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Status
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as DeliveryPartnerStatus,
                  })
                }
                className={`${inputCls} appearance-none`}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className={labelCls}>Zones covered</legend>
            <p className="mt-1 text-[12px] text-ink-soft">
              Pincodes from the delivery map. Add any other pincode below if
              they cover somewhere that is not on the map yet.
            </p>
            <div className="mt-2 grid max-h-[230px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {areas.map((area) => {
                const checked = draft.zones.includes(area.pincode);
                return (
                  <label
                    key={area.id}
                    className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                      checked
                        ? "border-leaf bg-[rgba(90,138,74,.08)]"
                        : "border-line bg-cream"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleZone(area.pincode)}
                        className="h-4 w-4 accent-leaf"
                      />
                      <span className="text-[13px] font-semibold tabular-nums">
                        {area.pincode}
                      </span>
                      {!area.active ? (
                        <span className="text-[10.5px] font-semibold uppercase text-carrot">
                          paused
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block pl-6 text-[11.5px] leading-snug text-ink-soft">
                      {area.area}, {area.city}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Pincodes not on the map — dispatch still needs to reach them. */}
            {draft.zones.filter((z) => !areas.some((a) => a.pincode === z))
              .length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {draft.zones
                  .filter((z) => !areas.some((a) => a.pincode === z))
                  .map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => toggleZone(z)}
                      className="rounded-full border border-leaf bg-[rgba(90,138,74,.08)] px-2.5 py-1 text-[11.5px] font-semibold tabular-nums"
                    >
                      {z} ×
                    </button>
                  ))}
              </div>
            ) : null}

            <div className="mt-3 flex gap-2">
              <input
                inputMode="numeric"
                value={extraZone}
                onChange={(e) =>
                  setExtraZone(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Another pincode"
                className="w-[180px] rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[13px] outline-none focus:border-leaf"
              />
              <button
                type="button"
                disabled={
                  extraZone.length !== 6 || draft.zones.includes(extraZone)
                }
                onClick={() => {
                  toggleZone(extraZone);
                  setExtraZone("");
                }}
                className={btnGhost}
              >
                Add zone
              </button>
            </div>
          </fieldset>

          <label className={labelCls}>
            Notes <span className="font-normal text-ink-soft">(optional)</span>
            <input
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="Weekends only; knows the Juhu lanes"
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
