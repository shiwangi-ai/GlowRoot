/** Database-backed customer accounts. Credentials never leave the server. */
import { db, type Customer as CustomerRow, type Prisma } from "@glowroot/db";
import type { User } from "@glowroot/types";
import { hashPassword, normaliseEmail, verifyPassword } from "@glowroot/auth";
export { hashPassword, normaliseEmail, verifyPassword };

export function userFromRow(row: CustomerRow): User {
  return {
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    pincode: row.pincode ?? undefined,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findUser(email: string): Promise<User | undefined> {
  const target = normaliseEmail(email);
  if (!target) return undefined;
  const row = await db.customer.findUnique({ where: { email: target } });
  return row ? userFromRow(row) : undefined;
}

/** Claim a guest account atomically; concurrent sign-ups cannot replace credentials. */
export async function registerUser(user: User): Promise<User | undefined> {
  return db.$transaction(async (tx) => {
    await tx.customer.upsert({
      where: { email: normaliseEmail(user.email) },
      create: { ...user, email: normaliseEmail(user.email), passwordHash: "" },
      update: {},
    });
    const result = await tx.customer.updateMany({
      where: { email: normaliseEmail(user.email), passwordHash: "" },
      data: { passwordHash: user.passwordHash, updatedAt: user.updatedAt },
    });
    if (!result.count) return undefined;
    return userFromRow(
      await tx.customer.findUniqueOrThrow({
        where: { email: normaliseEmail(user.email) },
      }),
    );
  });
}

type ProfileInput = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  pincode?: string;
  nowISO: string;
};

/** Shared by checkout so saving the profile and order uses one transaction. */
export async function upsertProfileRow(
  tx: Prisma.TransactionClient,
  input: ProfileInput,
) {
  const email = normaliseEmail(input.email);
  const details = {
    name: input.name.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
    pincode: input.pincode?.trim() || undefined,
  };
  return tx.customer.upsert({
    where: { email },
    create: {
      ...details,
      name: input.name.trim(),
      email,
      createdAt: input.nowISO,
      updatedAt: input.nowISO,
    },
    update: { ...details, updatedAt: input.nowISO },
  });
}

export async function upsertUserProfile(input: ProfileInput): Promise<User> {
  return userFromRow(await upsertProfileRow(db, input));
}
