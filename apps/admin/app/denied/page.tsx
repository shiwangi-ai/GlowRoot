import Link from "next/link";
import { getAdminIdentity } from "@/lib/access";

export const metadata = { title: "No access — GlowRoot Admin" };

export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string }>;
}) {
  const { need } = await searchParams;
  const identity = await getAdminIdentity();

  return (
    <div className="mx-auto max-w-[560px] py-16">
      <div className="text-[11px] font-bold uppercase tracking-[.13em] text-carrot">
        Access denied
      </div>
      <h1 className="mt-2 text-[32px]">You do not have access to this</h1>
      <p className="mt-3 text-[15px] text-ink-soft">
        Your roles do not include the permission this page requires. Ask an
        owner if you need it.
      </p>
      <dl className="mt-6 rounded-2xl border border-line bg-cream p-5 text-[13.5px]">
        {need ? (
          <div className="flex justify-between gap-4 border-b border-line pb-3">
            <dt className="text-ink-soft">Permission required</dt>
            <dd className="font-mono font-semibold">{need}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4 pt-3">
          <dt className="text-ink-soft">Your roles</dt>
          <dd className="text-right font-semibold">
            {identity?.roleNames.join(", ") || "none"}
          </dd>
        </div>
      </dl>
      <Link
        href="/"
        className="mt-8 inline-block font-semibold text-leaf hover:underline"
      >
        ← Back to the dashboard
      </Link>
    </div>
  );
}
