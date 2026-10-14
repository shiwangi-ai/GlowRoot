import { Prisma, type CustomerOrder } from "@glowroot/db";
import type { Order } from "@glowroot/types";

export function orderFromRow(row: CustomerOrder): Order {
  return {
    id: row.id,
    customer: {
      name: row.customerName,
      email: row.customerEmail,
      phone: row.customerPhone ?? undefined,
      address: row.customerAddress,
    },
    items: row.items as unknown as Order["items"],
    type: row.type as Order["type"],
    planSlug: row.planSlug ?? undefined,
    status: row.status as Order["status"],
    totalINR: row.totalINR,
    createdAt: row.createdAt.toISOString(),
    deliveryDate: row.deliveryDate,
    deliverySlot: row.deliverySlot ?? undefined,
    deliveryPincode: row.deliveryPincode ?? undefined,
    ...(row.partnerId ? { partnerId: row.partnerId } : {}),
    payment: (row.payment as unknown as Order["payment"]) ?? undefined,
    history: (row.history as unknown as Order["history"]) ?? undefined,
  };
}

export function orderToRow(order: Order) {
  return {
    id: order.id,
    customerName: order.customer.name,
    customerEmail: order.customer.email.trim().toLowerCase(),
    customerPhone: order.customer.phone ?? null,
    customerAddress: order.customer.address,
    items: JSON.parse(JSON.stringify(order.items)) as Prisma.InputJsonValue,
    type: order.type,
    planSlug: order.planSlug ?? null,
    status: order.status,
    totalINR: order.totalINR,
    createdAt: new Date(order.createdAt),
    deliveryDate: order.deliveryDate,
    deliverySlot: order.deliverySlot ?? null,
    deliveryPincode: order.deliveryPincode ?? null,
    partnerId: order.partnerId ?? null,
    payment: order.payment
      ? (JSON.parse(JSON.stringify(order.payment)) as Prisma.InputJsonValue)
      : Prisma.DbNull,
    history: order.history
      ? (JSON.parse(JSON.stringify(order.history)) as Prisma.InputJsonValue)
      : Prisma.DbNull,
  };
}
