"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { Order } from "@glowroot/types";
import { formatINR, formatDate, humanize } from "@glowroot/utils";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ListViewToggle,
  useListView,
  RecordList,
  RecordRow,
  RecordCell,
} from "@/components/ui/ListView";
import { inputCls, btnGhost } from "@/components/ui/form";

export type OrderListItem = Pick<
  Order,
  "id" | "type" | "planSlug" | "createdAt" | "totalINR" | "status"
> & {
  customer: Pick<Order["customer"], "name" | "email" | "phone">;
  partnerName: string | null;
};

export function OrdersList({
  orders,
  heading,
}: {
  orders: OrderListItem[];
  heading: ReactNode;
}) {
  const [view, changeView] = useListView("orders");
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filtered = orders.filter(
    (order) =>
      !query ||
      [
        order.id,
        order.customer.name,
        order.customer.email,
        order.customer.phone,
      ].some((value) => value?.toLowerCase().includes(query)),
  );
  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        {heading}
        <ListViewToggle
          view={view}
          onChange={changeView}
          label="Orders"
          controls="orders-list"
        />
      </header>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper p-4">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search orders</span>
          <input
            type="search"
            className={`${inputCls} !mt-0`}
            placeholder="Search order ID, customer name, email or phone…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-controls="orders-list"
          />
        </label>
        {search && (
          <button
            type="button"
            className={btnGhost}
            onClick={() => setSearch("")}
          >
            Clear search
          </button>
        )}
      </div>
      <p className="my-4 text-sm text-ink-soft" role="status">
        Showing {filtered.length} of {orders.length} orders
      </p>
      <RecordList
        view={view}
        id="orders-list"
        label="Orders"
        columns={[
          "Order",
          "Customer",
          "Type",
          "Placed",
          "Total",
          "Partner",
          "Status",
        ]}
        empty={
          orders.length === 0
            ? "No orders yet."
            : filtered.length === 0
              ? "No matching orders. Try another order ID, customer name, email or phone."
              : undefined
        }
      >
        {filtered.map((o) => (
          <RecordRow key={o.id}>
            <RecordCell label="Order" primary className="px-5 py-3">
              <Link
                href={`/orders/${o.id}`}
                className="font-semibold text-leaf hover:underline"
              >
                {o.id}
              </Link>
            </RecordCell>
            <RecordCell label="Customer" className="px-5 py-3">
              {o.customer.name}
            </RecordCell>
            <RecordCell label="Type" className="px-5 py-3 text-ink-soft">
              {humanize(o.type)}
              {o.planSlug ? ` · ${o.planSlug}` : ""}
            </RecordCell>
            <RecordCell label="Placed" className="px-5 py-3 text-ink-soft">
              {formatDate(o.createdAt)}
            </RecordCell>
            <RecordCell label="Total" className="px-5 py-3 font-semibold">
              {formatINR(o.totalINR)}
            </RecordCell>
            <RecordCell label="Partner" className="px-5 py-3 text-ink-soft">
              {o.partnerName ??
                (o.status === "delivered" || o.status === "cancelled" ? (
                  "—"
                ) : (
                  <span className="text-carrot">Unassigned</span>
                ))}
            </RecordCell>
            <RecordCell label="Status" className="px-5 py-3">
              <StatusBadge status={o.status} />
            </RecordCell>
          </RecordRow>
        ))}
      </RecordList>
    </div>
  );
}
