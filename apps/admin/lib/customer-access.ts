/** Current policy: only Super Admin (legacy Owner) and Admin see customer data. */
export function canViewCustomers(identity: {
  roleKeys: string[];
  permissions: Set<string>;
}): boolean {
  return (
    identity.roleKeys.some((key) =>
      ["owner", "super-admin", "admin"].includes(key),
    ) && identity.permissions.has("customers.view")
  );
}
