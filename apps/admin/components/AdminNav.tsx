"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { logoutAdmin } from "@/app/login/actions";
import { ModuleIcon, type ModuleIconName } from "./ModuleIcon";

export type NavIdentity = {
  canViewCustomers: boolean;
  name: string;
  email: string;
  roleNames: string[];
  permissions: string[];
  mfaOutstanding: boolean;
};

/**
 * Each link names the permission that opens it. Hiding a link the user cannot
 * use is a courtesy — the page itself still calls `requirePermission`.
 */
const links: {
  href: string;
  label: string;
  permission: string;
  icon: ModuleIconName;
  exact?: boolean;
}[] = [
  {
    href: "/",
    label: "Dashboard",
    permission: "dashboard.view",
    icon: "dashboard",
    exact: true,
  },
  {
    href: "/orders",
    label: "Orders",
    permission: "orders.view",
    icon: "orders",
  },
  {
    href: "/customers",
    label: "Customers",
    permission: "customers.view",
    icon: "customers",
  },
  {
    href: "/products",
    label: "Products",
    permission: "catalogue.view",
    icon: "products",
  },
  {
    href: "/materials",
    label: "Materials",
    permission: "inventory.view",
    icon: "materials",
  },
  {
    href: "/delivery",
    label: "Delivery partners",
    permission: "fulfilment.view",
    icon: "delivery",
  },
  {
    href: "/locations",
    label: "Locations",
    permission: "settings.view",
    icon: "locations",
  },
  {
    href: "/stores",
    label: "Stores",
    permission: "settings.view",
    icon: "stores",
  },
  {
    href: "/staff",
    label: "Staff & access",
    permission: "staff.view",
    icon: "staff",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminNav({
  identity,
  open,
  onNavigate,
  onClose,
}: {
  identity: NavIdentity;
  open: boolean | null;
  onNavigate: () => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (panel.current) panel.current.inert = open === false;
  }, [open]);
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, startTransition] = useTransition();
  const allowed = new Set(identity.permissions);

  function signOut() {
    startTransition(async () => {
      await logoutAdmin();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <aside
      ref={panel}
      id="admin-navigation"
      aria-label="Admin navigation"
      aria-hidden={open === false ? true : undefined}
      data-open={open === null ? undefined : String(open)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className="admin-sidebar"
    >
      <div className="admin-sidebar-clip">
        <div className="admin-sidebar-content border-line bg-paper">
          <nav className="flex flex-col gap-1 p-3">
            {links
              .filter(
                (link) =>
                  allowed.has(link.permission) &&
                  (link.href !== "/customers" || identity.canViewCustomers),
              )
              .map((link) => {
                const active = link.exact
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors ${
                      active
                        ? "bg-leaf text-white"
                        : "text-ink-soft hover:bg-[rgba(90,138,74,.12)] hover:text-leaf"
                    }`}
                  >
                    <ModuleIcon name={link.icon} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
          </nav>

          <div className="mt-auto border-t border-line p-4">
            {identity.mfaOutstanding ? (
              <p className="mb-3 rounded-xl border border-carrot/40 bg-carrot/[.08] px-3 py-2 text-[11.5px] text-carrot">
                Your role requires two-factor authentication. Enrolment is not
                available yet.
              </p>
            ) : null}

            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-leaf text-[12px] font-bold text-white">
                {initials(identity.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">
                  {identity.name}
                </span>
                <span className="block truncate text-[11px] text-ink-soft">
                  {identity.roleNames.join(", ") || "no roles"}
                </span>
              </span>
            </div>

            <a
              href={
                process.env.NEXT_PUBLIC_STOREFRONT_URL ??
                "http://localhost:3000"
              }
              className="mt-3 block text-[12px] text-ink-soft underline hover:text-leaf"
            >
              ↗ Open storefront
            </a>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="mt-2 block text-[12px] font-semibold text-carrot hover:underline disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
