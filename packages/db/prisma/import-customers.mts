/** One-time, transactional JSON import. Existing DB records always win. */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PrismaClient, Prisma } from "@prisma/client";
import type { Order, User, SessionRecord } from "../../types/src/index.ts";

const root = new URL("../../../", import.meta.url);
const db = new PrismaClient();
async function read<T>(name: string): Promise<T[]> {
  try {
    const value: unknown = JSON.parse(
      await readFile(new URL(name, root), "utf8"),
    );
    if (!Array.isArray(value)) throw new Error(`${name} must contain an array`);
    return value as T[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
const emailOf = (value: string) => {
  if (typeof value !== "string" || !value.trim() || !value.includes("@"))
    throw new Error("Invalid customer email in import");
  return value.trim().toLowerCase();
};

try {
  const [users, orders, sessions] = await Promise.all([
    read<User>(".glowroot-users.json"),
    read<Order>(".glowroot-orders.json"),
    read<SessionRecord>(".glowroot-sessions.json"),
  ]);
  const duplicates = new Set<string>();
  for (const user of users) {
    const email = emailOf(user.email);
    if (duplicates.has(email))
      throw new Error(
        "Duplicate customer emails found; resolve duplicates before importing.",
      );
    duplicates.add(email);
  }
  const result = await db.$transaction(
    async (tx) => {
      const before = {
        customers: await tx.customer.count(),
        orders: await tx.customerOrder.count(),
        sessions: await tx.customerSession.count(),
      };
      for (const user of users) {
        const email = emailOf(user.email);
        await tx.customer.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: user.name,
            phone: user.phone,
            address: user.address,
            pincode: user.pincode,
            passwordHash: user.passwordHash,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
        });
      }
      // Newest checkout supplies a profile only when no user/profile already exists.
      for (const order of [...orders].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )) {
        const email = emailOf(order.customer.email);
        if (await tx.customerOrder.findUnique({ where: { id: order.id } }))
          continue;
        const customer = await tx.customer.upsert({
          where: { email },
          update: {},
          create: {
            email,
            name: order.customer.name,
            phone: order.customer.phone,
            address: order.customer.address,
            pincode: order.deliveryPincode,
            createdAt: new Date(order.createdAt),
            updatedAt: new Date(order.createdAt),
          },
        });
        await tx.customerOrder.create({
          data: {
            id: order.id,
            customerId: customer.id,
            customerName: order.customer.name,
            customerEmail: email,
            customerPhone: order.customer.phone,
            customerAddress: order.customer.address,
            items: order.items as unknown as Prisma.InputJsonValue,
            type: order.type,
            planSlug: order.planSlug,
            status: order.status,
            totalINR: order.totalINR,
            createdAt: new Date(order.createdAt),
            deliveryDate: order.deliveryDate,
            deliverySlot: order.deliverySlot,
            deliveryPincode: order.deliveryPincode,
            partnerId: order.partnerId,
            payment: order.payment as unknown as
              Prisma.InputJsonValue | undefined,
            history: order.history as unknown as
              Prisma.InputJsonValue | undefined,
          },
        });
      }
      for (const session of sessions) {
        if (new Date(session.expiresAt) <= new Date()) continue;
        const customer = await tx.customer.findUnique({
          where: { email: emailOf(session.email) },
        });
        if (!customer?.passwordHash) continue;
        await tx.customerSession.upsert({
          where: { tokenHash: session.tokenHash },
          update: {},
          create: {
            tokenHash: session.tokenHash,
            customerId: customer.id,
            role: session.role,
            createdAt: new Date(session.createdAt),
            expiresAt: new Date(session.expiresAt),
            userAgent: session.userAgent,
          },
        });
      }
      return {
        customersAdded: (await tx.customer.count()) - before.customers,
        ordersAdded: (await tx.customerOrder.count()) - before.orders,
        sessionsAdded: (await tx.customerSession.count()) - before.sessions,
      };
    },
    { timeout: 60000 },
  );
  console.log("Import completed:", result);
  console.log("Original JSON files preserved at", fileURLToPath(root));
} catch (error) {
  // Prisma diagnostics may include input records; avoid logging customer data.
  console.error(
    "Import failed; no records were committed. Check source data and database connectivity.",
  );
  if (error instanceof Prisma.PrismaClientKnownRequestError)
    console.error("Database error code:", error.code);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
