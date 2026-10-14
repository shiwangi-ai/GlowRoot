"use client";

import { ModuleHeading } from "@/components/ModuleHeading";

import {
  ListViewToggle,
  useListView,
  RecordList,
  RecordRow,
  RecordCell,
} from "@/components/ui/ListView";

import { useMemo, useState } from "react";

type StaffStatus = "active" | "invited" | "suspended" | "disabled";
type SecurityState = "mfa-enabled" | "mfa-missing" | "invitation-pending";
type Tab = "users" | "roles" | "invitations";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: StaffStatus;
  security: SecurityState;
  sessions: number;
  lastLogin: string | null;
  addedAt: string;
  invitedBy: string;
};

type RoleDefinition = {
  key: string;
  name: string;
  description: string;
  permissions: string[];
};

const roles: RoleDefinition[] = [
  {
    key: "owner",
    name: "Super Admin",
    description: "Complete business, security, and staff administration.",
    permissions: [
      "All modules",
      "Staff management",
      "Roles & permissions",
      "Audit logs",
    ],
  },
  {
    key: "admin",
    name: "Admin",
    description: "Manages customers and day-to-day business operations.",
    permissions: [
      "Customers",
      "Orders",
      "Fulfilment",
      "Catalogue",
      "Inventory",
    ],
  },
  {
    key: "operations-manager",
    name: "Operations Manager",
    description: "Runs orders, fulfilment, and day-to-day operations.",
    permissions: [
      "Dashboard",
      "Manage orders",
      "Fulfilment",
      "Inventory overview",
    ],
  },
  {
    key: "fulfilment-agent",
    name: "Fulfilment Agent",
    description: "Prepares orders and advances delivery status.",
    permissions: [
      "View orders",
      "Update fulfilment status",
      "View fulfilment queue",
    ],
  },
  {
    key: "inventory-manager",
    name: "Inventory Manager",
    description: "Controls stock, receiving, adjustments, and wastage.",
    permissions: [
      "View inventory",
      "Adjust stock",
      "Receive stock",
      "Record wastage",
    ],
  },
  {
    key: "catalogue-manager",
    name: "Catalogue Manager",
    description: "Maintains products, plans, availability, and pricing.",
    permissions: [
      "Manage products",
      "Manage plans",
      "Change prices",
      "Publish catalogue",
    ],
  },
  {
    key: "customer-support",
    name: "Customer Support",
    description: "Assists customers and handles order-level support.",
    permissions: [
      "View orders",
      "View orders",
      "Edit delivery details",
      "Request cancellation",
    ],
  },
  {
    key: "finance-manager",
    name: "Finance Manager",
    description: "Reviews payments, refunds, invoices, and reports.",
    permissions: [
      "View payments",
      "Approve refunds",
      "Export finance reports",
      "View invoices",
    ],
  },
  {
    key: "auditor",
    name: "Auditor",
    description: "Read-only access to operational and audit records.",
    permissions: [
      "View dashboard",
      "View orders",
      "View inventory",
      "View audit logs",
    ],
  },
];

const initialUsers: StaffUser[] = [
  {
    id: "staff-1",
    name: "Shiwangi Sharma",
    email: "owner@glowroot.in",
    roles: ["Owner"],
    status: "active",
    security: "mfa-enabled",
    sessions: 2,
    lastLogin: "Today, 10:42 AM",
    addedAt: "01 Aug 2026",
    invitedBy: "System bootstrap",
  },
  {
    id: "staff-2",
    name: "Aman Mehta",
    email: "aman@glowroot.in",
    roles: ["Operations Manager"],
    status: "active",
    security: "mfa-enabled",
    sessions: 1,
    lastLogin: "Today, 9:18 AM",
    addedAt: "04 Aug 2026",
    invitedBy: "Shiwangi Sharma",
  },
  {
    id: "staff-3",
    name: "Priya Nair",
    email: "priya@glowroot.in",
    roles: ["Auditor"],
    status: "invited",
    security: "invitation-pending",
    sessions: 0,
    lastLogin: null,
    addedAt: "17 Aug 2026",
    invitedBy: "Shiwangi Sharma",
  },
  {
    id: "staff-4",
    name: "Kabir Singh",
    email: "kabir@glowroot.in",
    roles: ["Fulfilment Agent", "Inventory Manager"],
    status: "active",
    security: "mfa-missing",
    sessions: 1,
    lastLogin: "Yesterday, 5:31 PM",
    addedAt: "08 Aug 2026",
    invitedBy: "Aman Mehta",
  },
];

const statusStyle: Record<StaffStatus, string> = {
  active: "bg-[rgba(47,93,52,.12)] text-leaf",
  invited: "bg-[rgba(232,178,63,.18)] text-[#8a6514]",
  suspended: "bg-[rgba(217,119,46,.14)] text-carrot",
  disabled: "bg-cream-2 text-ink-soft",
};

const securityLabel: Record<SecurityState, string> = {
  "mfa-enabled": "MFA enabled",
  "mfa-missing": "MFA missing",
  "invitation-pending": "Invite pending",
};

function titleCase(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatusBadge({ status }: { status: StaffStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${statusStyle[status]}`}
    >
      {titleCase(status)}
    </span>
  );
}

function RoleBadges({ values }: { values: string[] }) {
  const visible = values.slice(0, 1);
  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((role) => (
        <span
          key={role}
          className="rounded-full border border-line bg-cream px-2.5 py-1 text-[11.5px] font-semibold text-ink"
        >
          {role}
        </span>
      ))}
      {values.length > 1 ? (
        <span className="rounded-full bg-cream-2 px-2 py-1 text-[11.5px] font-semibold text-ink-soft">
          +{values.length - 1}
        </span>
      ) : null}
    </div>
  );
}

function InviteDialog({
  open,
  onClose,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (input: { name: string; email: string; roles: string[] }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  if (!open) return null;

  const toggleRole = (role: string) => {
    setSelectedRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  };
  const selectedDefinitions = roles.filter((role) =>
    selectedRoles.includes(role.name),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/30"
      role="presentation"
    >
      <div
        className="h-full w-full max-w-[540px] overflow-y-auto border-l border-line bg-paper p-6 shadow-pop md:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.13em] text-leaf">
              Staff access
            </div>
            <h2 id="invite-title" className="mt-1 text-[26px]">
              Invite staff member
            </h2>
            <p className="mt-2 text-[14px] text-ink-soft">
              They will receive a secure link to create their own password.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invitation"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-xl text-ink-soft hover:border-leaf hover:text-leaf"
          >
            ×
          </button>
        </div>

        <div className="mt-7 space-y-4">
          <label className="block text-[13px] font-semibold">
            Full name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-3.5 py-3 text-[14px] outline-none focus:border-leaf"
              placeholder="Priya Sharma"
            />
          </label>
          <label className="block text-[13px] font-semibold">
            Work email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-cream px-3.5 py-3 text-[14px] outline-none focus:border-leaf"
              placeholder="priya@glowroot.in"
            />
          </label>
          <fieldset>
            <legend className="text-[13px] font-semibold">Assign roles</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {roles.map((role) => {
                const checked = selectedRoles.includes(role.name);
                return (
                  <label
                    key={role.key}
                    className={`cursor-pointer rounded-xl border p-3 transition-colors ${checked ? "border-leaf bg-[rgba(90,138,74,.08)]" : "border-line bg-cream"}`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.name)}
                        className="h-4 w-4 accent-leaf"
                      />
                      <span className="text-[13px] font-semibold">
                        {role.name}
                      </span>
                    </span>
                    <span className="mt-1 block pl-6 text-[11.5px] leading-snug text-ink-soft">
                      {role.description}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        {selectedDefinitions.length ? (
          <div className="mt-6 rounded-2xl border border-line bg-cream p-4">
            <div className="text-[12px] font-bold uppercase tracking-[.08em] text-ink-soft">
              Effective access preview
            </div>
            <ul className="mt-2 grid gap-1 text-[12.5px] text-ink">
              {Array.from(
                new Set(
                  selectedDefinitions.flatMap((role) => role.permissions),
                ),
              )
                .slice(0, 8)
                .map((permission) => (
                  <li key={permission}>✓ {permission}</li>
                ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 flex justify-end gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-[13px] font-semibold hover:border-leaf"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              !name.trim() ||
              !/^\S+@\S+\.\S+$/.test(email) ||
              selectedRoles.length === 0
            }
            onClick={() => {
              onInvite({
                name: name.trim(),
                email: email.trim().toLowerCase(),
                roles: selectedRoles,
              });
              setName("");
              setEmail("");
              setSelectedRoles([]);
            }}
            className="rounded-full bg-leaf px-5 py-2.5 text-[13px] font-bold text-white hover:bg-leaf-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send invitation
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleDrawer({
  user,
  onClose,
  onSave,
}: {
  user: StaffUser | null;
  onClose: () => void;
  onSave: (roles: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(user?.roles ?? []);
  if (!user) return null;

  const toggle = (role: string) => {
    setSelected((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/30"
      role="presentation"
    >
      <div
        className="h-full w-full max-w-[500px] overflow-y-auto border-l border-line bg-paper p-6 shadow-pop md:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="roles-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[.13em] text-leaf">
              Access control
            </div>
            <h2 id="roles-title" className="mt-1 text-[25px]">
              Manage roles
            </h2>
            <p className="mt-1 text-[14px] text-ink-soft">
              {user.name} · {user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close role management"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-xl text-ink-soft"
          >
            ×
          </button>
        </div>
        <div className="mt-7 space-y-2">
          {roles.map((role) => {
            const checked = selected.includes(role.name);
            return (
              <label
                key={role.key}
                className={`block cursor-pointer rounded-2xl border p-4 ${checked ? "border-leaf bg-[rgba(90,138,74,.08)]" : "border-line bg-cream"}`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(role.name)}
                    className="mt-1 h-4 w-4 accent-leaf"
                  />
                  <span>
                    <span className="block text-[14px] font-semibold">
                      {role.name}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-soft">
                      {role.description}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="mt-8 flex justify-end gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-5 py-2.5 text-[13px] font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={() => onSave(selected)}
            className="rounded-full bg-leaf px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
          >
            Save role changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function StaffManagement() {
  const [view, changeView] = useListView("staff");
  const [users, setUsers] = useState(initialUsers);
  const [tab, setTab] = useState<Tab>("users");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [securityFilter, setSecurityFilter] = useState("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleUserId, setRoleUserId] = useState<string | null>(null);
  const [menuUserId, setMenuUserId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const roleUser = users.find((user) => user.id === roleUserId) ?? null;
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      const matchesRole =
        roleFilter === "all" || user.roles.includes(roleFilter);
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;
      const matchesSecurity =
        securityFilter === "all" || user.security === securityFilter;
      return matchesSearch && matchesRole && matchesStatus && matchesSecurity;
    });
  }, [users, search, roleFilter, statusFilter, securityFilter]);

  const invitationUsers = users.filter((user) => user.status === "invited");

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3200);
  }

  function updateStatus(userId: string, status: StaffStatus) {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              status,
              sessions: status === "active" ? user.sessions : 0,
            }
          : user,
      ),
    );
    setMenuUserId(null);
    flash(`Demo only: account marked ${status}.`);
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "users", label: "Staff users", count: users.length },
    { id: "roles", label: "Roles & permissions", count: roles.length },
    { id: "invitations", label: "Invitations", count: invitationUsers.length },
  ];

  return (
    <div className="max-w-[1400px]">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <ModuleHeading
          icon="staff"
          title="Staff & access"
          eyebrow="Access control"
          description="Invite staff, assign job-based roles, and review who can access each admin module."
        />
        <div className="flex flex-wrap items-center gap-3">
          {tab === "users" && (
            <ListViewToggle
              view={view}
              onChange={(next) => {
                changeView(next);
                setMenuUserId(null);
              }}
              label="Staff"
              controls="staff-list"
            />
          )}
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="rounded-full bg-leaf px-5 py-2.5 font-display text-[14px] font-bold text-white shadow-float hover:bg-leaf-deep"
          >
            + Invite staff
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gold/50 bg-[rgba(232,178,63,.12)] px-4 py-3 text-[12.5px] text-ink-soft">
        <b className="text-ink">UI prototype:</b> changes on this page are
        temporary and reset on refresh. Database persistence will be connected
        through the new backend API.
      </div>

      {notice ? (
        <div
          role="status"
          className="fixed right-5 top-5 z-[70] rounded-xl bg-leaf px-4 py-3 text-[13px] font-semibold text-white shadow-pop"
        >
          {notice}
        </div>
      ) : null}

      <div className="mt-7 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-[13px] font-semibold ${tab === item.id ? "border-leaf text-leaf" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {item.label}{" "}
            <span className="ml-1 rounded-full bg-cream-2 px-2 py-0.5 text-[11px]">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "users" ? (
        <section className="mt-6">
          <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-paper p-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name or email…"
              className="min-w-[220px] flex-1 rounded-xl border border-line bg-cream px-3.5 py-2.5 text-[13px] outline-none focus:border-leaf"
            />
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              aria-label="Filter by role"
              className="rounded-xl border border-line bg-cream px-3 py-2.5 text-[13px] outline-none focus:border-leaf"
            >
              <option value="all">All roles</option>
              {roles.map((role) => (
                <option key={role.key} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by status"
              className="rounded-xl border border-line bg-cream px-3 py-2.5 text-[13px] outline-none focus:border-leaf"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="invited">Invited</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Disabled</option>
            </select>
            <select
              value={securityFilter}
              onChange={(event) => setSecurityFilter(event.target.value)}
              aria-label="Filter by security"
              className="rounded-xl border border-line bg-cream px-3 py-2.5 text-[13px] outline-none focus:border-leaf"
            >
              <option value="all">All security</option>
              <option value="mfa-enabled">MFA enabled</option>
              <option value="mfa-missing">MFA missing</option>
              <option value="invitation-pending">Invite pending</option>
            </select>
            {search ||
            roleFilter !== "all" ||
            statusFilter !== "all" ||
            securityFilter !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setRoleFilter("all");
                  setStatusFilter("all");
                  setSecurityFilter("all");
                }}
                className="px-2 text-[12px] font-semibold text-carrot hover:underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          <div className="mt-4">
            <RecordList
              view={view}
              id="staff-list"
              label="Staff"
              columns={[
                "Staff member",
                "Role",
                "Status",
                "Security",
                "Last login",
                "Added",
                "Actions",
              ]}
              empty={
                filtered.length === 0
                  ? "No staff members match these filters."
                  : undefined
              }
            >
              {filtered.map((user) => (
                <RecordRow key={user.id}>
                  <RecordCell
                    label="Staff member"
                    primary
                    className="px-4 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgba(90,138,74,.14)] text-[11px] font-bold text-leaf">
                        {initials(user.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">
                          {user.name}
                        </span>
                        <span className="block truncate text-[11.5px] text-ink-soft">
                          {user.email}
                        </span>
                      </span>
                    </div>
                  </RecordCell>
                  <RecordCell label="Role" className="px-4 py-4">
                    <RoleBadges values={user.roles} />
                  </RecordCell>
                  <RecordCell label="Status" className="px-4 py-4">
                    <StatusBadge status={user.status} />
                  </RecordCell>
                  <RecordCell label="Security" className="px-4 py-4">
                    <span
                      className={
                        user.security === "mfa-missing"
                          ? "font-semibold text-carrot"
                          : "text-ink-soft"
                      }
                    >
                      {securityLabel[user.security]}
                    </span>
                    {user.sessions ? (
                      <span className="mt-0.5 block text-[11px] text-ink-soft">
                        {user.sessions} active session
                        {user.sessions === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </RecordCell>
                  <RecordCell
                    label="Last login"
                    className="px-4 py-4 text-ink-soft"
                  >
                    {user.lastLogin ?? "Never"}
                  </RecordCell>
                  <RecordCell label="Added" className="px-4 py-4 text-ink-soft">
                    {user.addedAt}
                    <span className="block truncate text-[11px]">
                      by {user.invitedBy}
                    </span>
                  </RecordCell>
                  <RecordCell
                    label="Actions"
                    className="relative px-4 py-4 text-right"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setMenuUserId(menuUserId === user.id ? null : user.id)
                      }
                      aria-label={`Actions for ${user.name}`}
                      className="rounded-full border border-line px-3 py-1.5 text-lg leading-none text-ink-soft hover:border-leaf"
                    >
                      ⋯
                    </button>
                    {menuUserId === user.id ? (
                      <div className="absolute right-4 top-12 z-20 w-[210px] rounded-xl border border-line bg-paper p-1.5 text-left shadow-pop">
                        <button
                          type="button"
                          onClick={() => {
                            setRoleUserId(user.id);
                            setMenuUserId(null);
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-[12.5px] hover:bg-cream"
                        >
                          Manage roles
                        </button>
                        {user.status === "invited" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuUserId(null);
                              flash("Demo only: invitation resent.");
                            }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-[12.5px] hover:bg-cream"
                          >
                            Resend invitation
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuUserId(null);
                              flash("Demo only: password reset requested.");
                            }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-[12.5px] hover:bg-cream"
                          >
                            Send password reset
                          </button>
                        )}
                        {user.sessions > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setUsers((current) =>
                                current.map((item) =>
                                  item.id === user.id
                                    ? { ...item, sessions: 0 }
                                    : item,
                                ),
                              );
                              setMenuUserId(null);
                              flash("Demo only: sessions revoked.");
                            }}
                            className="block w-full rounded-lg px-3 py-2 text-left text-[12.5px] hover:bg-cream"
                          >
                            Revoke sessions
                          </button>
                        ) : null}
                        {user.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(user.id, "suspended")}
                            className="block w-full rounded-lg px-3 py-2 text-left text-[12.5px] text-carrot hover:bg-cream"
                          >
                            Suspend account
                          </button>
                        ) : user.status === "suspended" ? (
                          <button
                            type="button"
                            onClick={() => updateStatus(user.id, "active")}
                            className="block w-full rounded-lg px-3 py-2 text-left text-[12.5px] text-leaf hover:bg-cream"
                          >
                            Reactivate account
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </RecordCell>
                </RecordRow>
              ))}
            </RecordList>
          </div>
        </section>
      ) : null}

      {tab === "roles" ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => {
            const assigned = users.filter((user) =>
              user.roles.includes(role.name),
            ).length;
            return (
              <article
                key={role.key}
                className="rounded-2xl border border-line bg-paper p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[18px]">{role.name}</h2>
                    <p className="mt-1 text-[12.5px] text-ink-soft">
                      {role.description}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-cream-2 px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                    {assigned} user{assigned === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <div className="text-[11px] font-bold uppercase tracking-[.08em] text-ink-soft">
                    Access summary
                  </div>
                  <ul className="mt-2 space-y-1.5 text-[12.5px]">
                    {role.permissions.map((permission) => (
                      <li key={permission}>✓ {permission}</li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {tab === "invitations" ? (
        <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-paper">
          {invitationUsers.length ? (
            invitationUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5 last:border-0"
              >
                <div>
                  <div className="font-semibold">{user.name}</div>
                  <div className="text-[12px] text-ink-soft">
                    {user.email} · invited {user.addedAt} by {user.invitedBy}
                  </div>
                  <div className="mt-2">
                    <RoleBadges values={user.roles} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => flash("Demo only: invitation resent.")}
                    className="rounded-full border border-line px-4 py-2 text-[12px] font-semibold hover:border-leaf"
                  >
                    Resend
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUsers((current) =>
                        current.filter((item) => item.id !== user.id),
                      );
                      flash("Demo only: invitation revoked.");
                    }}
                    className="rounded-full border border-carrot/40 px-4 py-2 text-[12px] font-semibold text-carrot"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-[14px] text-ink-soft">
              There are no pending invitations.
            </div>
          )}
        </section>
      ) : null}

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={(input) => {
          setUsers((current) => [
            ...current,
            {
              id: `staff-${Date.now()}`,
              name: input.name,
              email: input.email,
              roles: input.roles,
              status: "invited",
              security: "invitation-pending",
              sessions: 0,
              lastLogin: null,
              addedAt: "Today",
              invitedBy: "Current admin",
            },
          ]);
          setInviteOpen(false);
          setTab("invitations");
          flash(
            "Demo invitation created. Backend delivery is not connected yet.",
          );
        }}
      />
      <RoleDrawer
        key={roleUser?.id ?? "none"}
        user={roleUser}
        onClose={() => setRoleUserId(null)}
        onSave={(nextRoles) => {
          if (!roleUser) return;
          setUsers((current) =>
            current.map((user) =>
              user.id === roleUser.id ? { ...user, roles: nextRoles } : user,
            ),
          );
          setRoleUserId(null);
          flash("Demo only: roles updated for this session.");
        }}
      />
    </div>
  );
}
