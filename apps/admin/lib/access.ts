import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { canViewCustomers } from "./customer-access";
export { canViewCustomers } from "./customer-access";
import { readAdminSession } from "./session";

/**
 * Who is calling, and what they may do.
 *
 * Permissions are the union across every role the user holds — additive, and
 * denied by default. `docs/admin-rbac.md` is the vocabulary; this module is the
 * only place the app should ask the question.
 *
 * Authorization must be enforced here and in server actions, never by hiding
 * navigation. Middleware only checks that a cookie exists.
 */
export type AdminIdentity = {
  id: string;
  email: string;
  name: string;
  roleKeys: string[];
  roleNames: string[];
  permissions: Set<string>;
  /** True when a role they hold demands a second factor they have not enrolled. */
  mfaOutstanding: boolean;
};

/** Deduped per request, so a page and its actions share one query. */
export const getAdminIdentity = cache(
  async (): Promise<AdminIdentity | null> => {
    const session = await readAdminSession();
    if (!session) return null;

    const { user } = session;
    const permissions = new Set<string>();
    for (const link of user.roles) {
      for (const grant of link.role.permissions)
        permissions.add(grant.permission.key);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleKeys: user.roles.map((r) => r.role.key),
      roleNames: user.roles.map((r) => r.role.name),
      permissions,
      mfaOutstanding:
        user.roles.some((r) => r.role.requiresMfa) && !user.mfaEnrolledAt,
    };
  },
);

/** For pages. Sends anonymous callers to the login screen. */
export async function requireAdmin(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/login");
  return identity;
}

export async function requirePermission(key: string): Promise<AdminIdentity> {
  const identity = await requireAdmin();
  if (!identity.permissions.has(key))
    redirect(`/denied?need=${encodeURIComponent(key)}`);
  return identity;
}

/**
 * For server actions, which should return an error rather than redirect.
 * Returns the identity or a reason string — never throws.
 */
export async function checkPermission(
  key: string,
): Promise<
  { ok: true; identity: AdminIdentity } | { ok: false; error: string }
> {
  const identity = await getAdminIdentity();
  if (!identity)
    return { ok: false, error: "Your session has expired. Sign in again." };
  if (!identity.permissions.has(key)) {
    return { ok: false, error: "You do not have permission to do that." };
  }
  return { ok: true, identity };
}

/**
 * Staff cannot grant a permission they do not themselves hold — otherwise any
 * holder of `staff.edit_roles` could promote themselves to Owner.
 */
export function canGrantAll(granter: AdminIdentity, keys: string[]): boolean {
  return keys.every((key) => granter.permissions.has(key));
}

/** A direct URL must enforce the same role policy as the navigation. */
export async function requireCustomerAdmin(): Promise<AdminIdentity> {
  const identity = await requireAdmin();
  if (!canViewCustomers(identity)) redirect("/denied?need=customers.view");
  return identity;
}
