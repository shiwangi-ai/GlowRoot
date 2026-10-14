import Link from "next/link";
import { db } from "@glowroot/db";
import { ModuleHeading } from "@/components/ModuleHeading";
import { requireCustomerAdmin } from "@/lib/access";
import { formatDate } from "@glowroot/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers — GlowRoot Admin" };
const PAGE_SIZE = 25;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireCustomerAdmin();
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 120);
  const requestedPage = Math.max(
    1,
    Math.min(1000000, Number.parseInt(params.page ?? "1", 10) || 1),
  );
  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
        ],
      }
    : {};
  const total = await db.customer.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  const customers = await db.customer.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      pincode: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });
  const pageLink = (value: number) =>
    `/customers?${new URLSearchParams({ q, page: String(value) })}`;
  return (
    <div>
      <ModuleHeading
        icon="customers"
        title="Customers"
        description="Customer profiles and order history. Access is limited to Super Admin and Admin."
      />
      <form className="mt-8 flex flex-wrap gap-3 rounded-2xl border border-line bg-paper p-4">
        <label className="min-w-0 flex-1">
          <span className="sr-only">
            Search customers by name, email or phone
          </span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            maxLength={120}
            placeholder="Search name, email or phone…"
            className="w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-sm"
          />
        </label>
        <button className="rounded-xl bg-leaf px-5 py-2.5 text-sm font-semibold text-white">
          Search
        </button>
        {q && (
          <Link href="/customers" className="px-3 py-2.5 text-sm text-leaf">
            Clear
          </Link>
        )}
      </form>
      <p className="my-4 text-sm text-ink-soft">
        {total} {total === 1 ? "customer" : "customers"}
        {q ? " matching your search" : " in the system"}
      </p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-cream-2 text-ink-soft">
            <tr>
              {["Customer", "Contact", "Pincode", "Orders", "Added"].map(
                (label) => (
                  <th key={label} className="px-5 py-4 font-medium">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className="px-5 py-4">
                  <Link
                    className="font-semibold text-leaf hover:underline"
                    href={`/customers/${customer.id}`}
                  >
                    {customer.name || "Unnamed customer"}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <p>{customer.email}</p>
                  <p className="mt-1 text-ink-soft">
                    {customer.phone || "No phone saved"}
                  </p>
                </td>
                <td className="px-5 py-4">{customer.pincode || "—"}</td>
                <td className="px-5 py-4">{customer._count.orders}</td>
                <td className="whitespace-nowrap px-5 py-4">
                  {formatDate(customer.createdAt.toISOString())}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && (
          <p className="p-8 text-center text-ink-soft">
            {q
              ? "No matching customers. Try another name, email or phone."
              : "No customers yet. New registrations and checkouts will appear here."}
          </p>
        )}
      </div>
      <nav
        aria-label="Customer pages"
        className="mt-5 flex items-center justify-between text-sm"
      >
        {page > 1 ? (
          <Link className="text-leaf hover:underline" href={pageLink(page - 1)}>
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        <span className="text-ink-soft">
          Page {page} of {pages}
        </span>
        {page < pages ? (
          <Link className="text-leaf hover:underline" href={pageLink(page + 1)}>
            Next →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
