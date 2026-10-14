import { getShops } from "@glowroot/data";
import { Eyebrow } from "@glowroot/ui";
import { StoreLocator } from "@/components/StoreLocator";

export const metadata = { title: "Find a store — GlowRoot" };
export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const shops = await getShops();
  const locations = shops.map(
    ({ id, name, address, city, pincode, phone }) => ({
      id,
      name,
      address,
      city,
      pincode,
      phone,
    }),
  );

  return (
    <div className="max-w-wrap mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <Eyebrow>Fresh juice, closer to you</Eyebrow>
      <h1 className="mt-3 text-[clamp(32px,5vw,52px)]">Find your GlowRoot</h1>
      <p className="mt-3 max-w-xl text-base text-ink-soft">
        Search by store name, city or pincode. Choose a shop to see it on the
        map and plan your visit.
      </p>
      <StoreLocator shops={locations} />
    </div>
  );
}
