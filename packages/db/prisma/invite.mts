/**
 * Mints an admin invitation from the command line.
 *
 * This is the bootstrap path: the seeded Owner has no password, and nobody may
 * set another person's password, so the only way to a first login is an
 * invitation link. There is no mail provider yet, so the link is printed here.
 *
 *   pnpm --filter @glowroot/db invite you@example.com
 *   pnpm --filter @glowroot/db invite new@example.com "New Person" operations-manager
 */
import { PrismaClient } from "@prisma/client";
import { hashToken, newToken, normaliseEmail } from "@glowroot/auth";

const db = new PrismaClient();
const INVITATION_DAYS = 7;

const [rawEmail, maybeName, ...roleKeys] = process.argv.slice(2);
if (!rawEmail) {
  console.error("usage: invite <email> [name] [role-key ...]");
  process.exit(1);
}

const email = normaliseEmail(rawEmail);

async function main() {
  const existing = await db.adminUser.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  if (existing && existing.status === "ACTIVE") {
    console.error(
      `${email} is already active. Use the password reset flow instead.`,
    );
    process.exit(1);
  }

  const name = maybeName?.trim() || existing?.name || email.split("@")[0];

  // Roles: explicit keys win, then whatever the account already holds, then owner.
  let keys = roleKeys;
  if (!keys.length) keys = existing?.roles.map((r) => r.role.key) ?? [];
  if (!keys.length) keys = ["owner"];

  const roles = await db.adminRole.findMany({ where: { key: { in: keys } } });
  const missing = keys.filter((k) => !roles.some((r) => r.key === k));
  if (missing.length) {
    console.error(`unknown role(s): ${missing.join(", ")}`);
    console.error(
      `available: ${(await db.adminRole.findMany()).map((r) => r.key).join(", ")}`,
    );
    process.exit(1);
  }

  const user =
    existing ??
    (await db.adminUser.create({ data: { email, name, status: "INVITED" } }));

  // An invitation must name an inviter; bootstrapping, that is the invitee.
  const token = newToken();
  await db.adminInvitation.updateMany({
    where: { email, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  const invitation = await db.adminInvitation.create({
    data: {
      email,
      name,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000),
      invitedById: user.id,
      roles: { create: roles.map((role) => ({ roleId: role.id })) },
    },
  });

  await db.adminAuditLog.create({
    data: {
      actorUserId: user.id,
      action: "staff.invited",
      targetType: "admin_invitation",
      targetId: invitation.id,
      afterData: { email, name, roles: roles.map((r) => r.key), via: "cli" },
    },
  });

  const base =
    process.env.ADMIN_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3001";
  console.log("");
  console.log(`  invited : ${name} <${email}>`);
  console.log(`  roles   : ${roles.map((r) => r.name).join(", ")}`);
  console.log(`  expires : ${invitation.expiresAt.toISOString()}`);
  console.log("");
  console.log(`  ${base}/invite/${token}`);
  console.log("");
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
