/**
 * Seeds the admin RBAC vocabulary: permission keys, roles, and the role →
 * permission matrix from `docs/admin-rbac.md`.
 *
 * Idempotent — safe to re-run after editing the matrix. Permissions are
 * additive and denied by default, so a role simply holds the keys listed here
 * and nothing else. Removing a key from a role revokes it on the next run.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** module → action → human description. The unique key is `module.action`. */
const PERMISSIONS: Record<string, Record<string, string>> = {
  dashboard: { view: "See the admin dashboard and its summary tiles." },
  orders: {
    view: "List and open orders.",
    view_delivery_details: "See delivery address, slot, and contact number.",
    update_status: "Advance an order through any legal status transition.",
    mark_pressing: "Move a confirmed order into pressing.",
    mark_out_for_delivery: "Move a pressed order out for delivery.",
    mark_delivered: "Mark an order delivered.",
    cancel: "Cancel an order.",
    edit_delivery: "Change delivery date, slot, or address.",
    edit_total: "Adjust an order total or line pricing.",
    export: "Export order data.",
  },
  customers: {
    view: "Look up customer accounts and their order history.",
    view_delivery_contact: "See only the name and phone needed for a delivery.",
    edit: "Edit customer profile details.",
    add_note: "Attach a support note to a customer.",
    export: "Export customer data.",
    delete: "Delete or anonymise a customer account.",
  },
  catalogue: {
    view: "Browse products, combos, and plans.",
    create: "Create products, combos, or plans.",
    edit: "Edit catalogue entries.",
    publish: "Publish or unpublish catalogue entries.",
    delete: "Delete catalogue entries.",
    change_price: "Change a price.",
  },
  inventory: {
    view: "See materials and stock levels.",
    adjust: "Make a manual stock adjustment.",
    receive: "Record received stock.",
    record_wastage: "Record wastage.",
  },
  fulfilment: {
    view: "See the fulfilment queue.",
    manage: "Assign, batch, and progress fulfilment work.",
  },
  subscriptions: {
    view: "See subscriptions and their schedules.",
    manage: "Edit a subscription's plan or schedule.",
    pause: "Pause a subscription.",
    cancel: "Cancel a subscription.",
  },
  payments: {
    view: "See payments and their status.",
    refund_request: "Raise a refund for approval.",
    refund_approve: "Approve and issue a refund.",
    export: "Export payment data.",
  },
  reports: {
    view: "View operational and financial reports.",
    export: "Export reports.",
  },
  staff: {
    view: "See staff accounts and their roles.",
    invite: "Invite a new staff member.",
    edit_roles: "Change which roles a staff member holds.",
    disable: "Suspend or disable a staff account.",
    reset_mfa: "Clear a staff member's second factor so they can re-enrol.",
  },
  settings: { view: "View settings.", manage: "Change settings." },
  audit: { view: "Read the audit log." },
};

const ALL_KEYS = Object.entries(PERMISSIONS).flatMap(([module, actions]) =>
  Object.keys(actions).map((action) => `${module}.${action}`),
);

type RoleSeed = {
  key: string;
  name: string;
  description: string;
  requiresMfa: boolean;
  permissions: string[] | "*";
};

/**
 * The permission matrix. Every "Limited"/"Approve"/"Request" cell from the
 * design is spelled out as explicit keys here rather than special-cased in
 * page code — that was the whole point of the granular keys.
 */
const ROLES: RoleSeed[] = [
  {
    key: "owner",
    name: "Super Admin",
    description: "Complete business, security, and staff administration.",
    requiresMfa: true,
    permissions: "*",
  },
  {
    key: "admin",
    name: "Admin",
    description: "Manages customers and day-to-day business operations.",
    requiresMfa: true,
    permissions: ALL_KEYS.filter(
      (key) =>
        !key.startsWith("staff.") &&
        !key.startsWith("audit.") &&
        key !== "settings.manage",
    ),
  },
  {
    key: "operations-manager",
    name: "Operations Manager",
    description: "Runs orders, fulfilment, and day-to-day operations.",
    requiresMfa: true, // can cancel orders and approve refunds
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.view_delivery_details",
      "orders.update_status",
      "orders.mark_pressing",
      "orders.mark_out_for_delivery",
      "orders.mark_delivered",
      "orders.cancel",
      "orders.edit_delivery",
      "orders.edit_total",
      "orders.export",
      "customers.view",
      "catalogue.view",
      "inventory.view",
      "inventory.adjust",
      "inventory.receive",
      "inventory.record_wastage",
      "fulfilment.view",
      "fulfilment.manage",
      "subscriptions.view",
      "subscriptions.manage",
      "subscriptions.pause",
      "subscriptions.cancel",
      "payments.view",
      "payments.refund_approve",
      "reports.view",
      "settings.view",
      "settings.manage",
      "audit.view",
    ],
  },
  {
    key: "fulfilment-agent",
    name: "Fulfilment Agent",
    description: "Prepares orders and advances delivery status.",
    requiresMfa: false,
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.view_delivery_details",
      "orders.mark_pressing",
      "orders.mark_out_for_delivery",
      "orders.mark_delivered",
      "customers.view_delivery_contact",
      "catalogue.view",
      "inventory.view",
      "fulfilment.view",
      "fulfilment.manage",
      "subscriptions.view",
    ],
  },
  {
    key: "inventory-manager",
    name: "Inventory Manager",
    description: "Controls stock, receiving, adjustments, and wastage.",
    requiresMfa: false,
    permissions: [
      "dashboard.view",
      "orders.view",
      "catalogue.view",
      "inventory.view",
      "inventory.adjust",
      "inventory.receive",
      "inventory.record_wastage",
      "fulfilment.view",
      "reports.view",
    ],
  },
  {
    key: "catalogue-manager",
    name: "Catalogue Manager",
    description: "Maintains products, plans, availability, and pricing.",
    requiresMfa: false,
    permissions: [
      "dashboard.view",
      "orders.view",
      "catalogue.view",
      "catalogue.create",
      "catalogue.edit",
      "catalogue.publish",
      "catalogue.delete",
      "catalogue.change_price",
      "inventory.view",
      "subscriptions.view",
      "reports.view",
    ],
  },
  {
    key: "customer-support",
    name: "Customer Support",
    description: "Assists customers and handles order-level support.",
    requiresMfa: false,
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.view_delivery_details",
      "orders.edit_delivery",
      "orders.cancel",
      "customers.view",
      "customers.edit",
      "customers.add_note",
      "catalogue.view",
      "fulfilment.view",
      "subscriptions.view",
      "subscriptions.manage",
      "subscriptions.pause",
      "subscriptions.cancel",
      "payments.view",
      "payments.refund_request",
    ],
  },
  {
    key: "finance-manager",
    name: "Finance Manager",
    description: "Reviews payments, refunds, invoices, and reports.",
    requiresMfa: true, // approves refunds and exports payment data
    permissions: [
      "dashboard.view",
      "orders.view",
      "customers.view",
      "catalogue.view",
      "inventory.view",
      "subscriptions.view",
      "payments.view",
      "payments.refund_request",
      "payments.refund_approve",
      "payments.export",
      "reports.view",
      "reports.export",
      "settings.view",
      "audit.view",
    ],
  },
  {
    key: "auditor",
    name: "Auditor",
    description: "Read-only access to operational and audit records.",
    requiresMfa: false,
    permissions: [
      "dashboard.view",
      "orders.view",
      "customers.view",
      "catalogue.view",
      "inventory.view",
      "fulfilment.view",
      "subscriptions.view",
      "payments.view",
      "reports.view",
      "settings.view",
      "audit.view",
    ],
  },
];

async function main() {
  // 1. Permissions
  for (const [module, actions] of Object.entries(PERMISSIONS)) {
    for (const [action, description] of Object.entries(actions)) {
      const key = `${module}.${action}`;
      await db.adminPermission.upsert({
        where: { key },
        update: { module, action, description },
        create: { key, module, action, description },
      });
    }
  }
  console.log(`permissions: ${ALL_KEYS.length}`);

  // 2. Roles + their grants, replacing each role's grant set so edits revoke.
  for (const role of ROLES) {
    const keys = (
      role.permissions === "*" ? ALL_KEYS : role.permissions
    ).filter(
      (key) =>
        ["owner", "admin"].includes(role.key) ||
        (!key.startsWith("customers.") &&
          key !== "orders.view_delivery_details"),
    );
    const unknown = keys.filter((k) => !ALL_KEYS.includes(k));
    if (unknown.length)
      throw new Error(`${role.key}: unknown keys ${unknown.join(", ")}`);

    const record = await db.adminRole.upsert({
      where: { key: role.key },
      update: {
        name: role.name,
        description: role.description,
        isSystemRole: true,
        requiresMfa: role.requiresMfa,
      },
      create: {
        key: role.key,
        name: role.name,
        description: role.description,
        isSystemRole: true,
        requiresMfa: role.requiresMfa,
      },
    });

    const permissions = await db.adminPermission.findMany({
      where: { key: { in: keys } },
      select: { id: true },
    });
    await db.$transaction([
      db.adminRolePermission.deleteMany({ where: { roleId: record.id } }),
      db.adminRolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: record.id,
          permissionId: p.id,
        })),
      }),
    ]);
    console.log(
      `  ${role.key.padEnd(20)} ${String(keys.length).padStart(2)} permissions${role.requiresMfa ? "  (MFA required)" : ""}`,
    );
  }

  // 3. Optional first Owner. Created INVITED with no password — the invitation
  //    flow is how they set one; nobody ever types another person's password.
  const bootstrap = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (bootstrap) {
    const owner = await db.adminRole.findUniqueOrThrow({
      where: { key: "owner" },
    });
    const user = await db.adminUser.upsert({
      where: { email: bootstrap },
      update: {},
      create: {
        email: bootstrap,
        name: process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "Owner",
        status: "INVITED",
      },
    });
    await db.adminUserRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: owner.id } },
      update: {},
      create: { userId: user.id, roleId: owner.id },
    });
    console.log(`bootstrap owner: ${bootstrap} (status INVITED, no password)`);
  } else {
    console.log(
      "bootstrap owner: skipped (set ADMIN_BOOTSTRAP_EMAIL to create one)",
    );
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
