import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  glowrootPrisma?: PrismaClient;
};

export const db = globalForPrisma.glowrootPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.glowrootPrisma = db;
}

export * from "@prisma/client";
