"use client";

import { ModuleHeading } from "@/components/ModuleHeading";

import { useState, useTransition } from "react";
import {
  ListViewToggle,
  useListView,
  RecordList,
  RecordRow,
  RecordCell,
} from "@/components/ui/ListView";
import { useRouter } from "next/navigation";
import type { Material, Product, ProductKind, Season } from "@glowroot/types";
import { formatINR, humanize } from "@glowroot/utils";
import { ProductImagePreview } from "@/components/ProductImagePreview";
import { Drawer } from "@/components/ui/Drawer";
import {
  btnPrimary,
  btnGhost,
  inputCls,
  labelCls,
  selectCls,
} from "@/components/ui/form";
import { ProductImagePicker } from "./ProductImagePicker";
import { saveProduct } from "@/app/products/actions";

const blank: Product = {
  slug: "",
  name: "",
  kind: "juice",
  priceINR: 0,
  volumeMl: 100,
  ingredients: [],
  description: "",
  imageUrl: "",
  tags: [],
  season: "all",
  recipe: [],
};
const split = (value: string) =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

export function ProductsManager({
  products,
  materials,
  canCreate,
  canEdit,
  canChangePrice,
}: {
  products: Product[];
  materials: Material[];
  canCreate: boolean;
  canEdit: boolean;
  canChangePrice: boolean;
}) {
  const router = useRouter();
  const [view, changeView] = useListView("products", "cards");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [season, setSeason] = useState("any");
  const [selected, setSelected] = useState<Product | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Product>(blank);
  const [ingredients, setIngredients] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [imagePending, setImagePending] = useState(false);
  const [pending, startTransition] = useTransition();
  const query = search.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      (!query ||
        [p.name, p.slug, ...p.ingredients]
          .join(" ")
          .toLowerCase()
          .includes(query)) &&
      (category === "all" || p.kind === category) &&
      (season === "any" || (p.season ?? "all") === season),
  );
  function openEdit(product: Product | null) {
    const value = product ?? blank;
    setSelected(product);
    setDraft({ ...value, recipe: value.recipe.map((r) => ({ ...r })) });
    setIngredients(value.ingredients.join(", "));
    setTags(value.tags.join(", "));
    setError("");
    setEditing(true);
  }
  function close() {
    if (!pending) {
      setEditing(false);
      setSelected(null);
      setError("");
    }
  }
  function save() {
    if (pending || imagePending) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await saveProduct(selected?.slug ?? null, {
          ...draft,
          ingredients: split(ingredients),
          tags: split(tags),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setEditing(false);
        setSelected(null);
        setNotice(`${draft.name} saved to the catalogue.`);
        router.refresh();
      } catch {
        setError(
          "Could not reach the server. Your changes are still here; try again.",
        );
      }
    });
  }
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <ModuleHeading
          icon="products"
          title="Products"
          eyebrow="Catalogue"
          description="Manage your menu, prices and recipes in one place."
        />
        <div className="flex flex-wrap items-center gap-3">
          <ListViewToggle
            view={view}
            onChange={changeView}
            label="Products"
            controls="products-list"
          />
          {canCreate && (
            <button className={btnPrimary} onClick={() => openEdit(null)}>
              + Add product
            </button>
          )}
        </div>
      </header>
      {notice && (
        <p role="status" className="mt-4 text-sm text-leaf">
          {notice}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-line bg-paper p-4">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search products</span>
          <input
            className={`${inputCls} !mt-0 min-w-0`}
            placeholder="Search products or ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter by category"
          className={selectCls}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          <option value="juice">Juices</option>
          <option value="smoothie">Smoothies</option>
          <option value="shot">Shots</option>
        </select>
        <select
          aria-label="Filter by season"
          className={selectCls}
          value={season}
          onChange={(e) => setSeason(e.target.value)}
        >
          <option value="any">Any season</option>
          <option value="all">Year-round</option>
          <option value="summer">Summer</option>
          <option value="winter">Winter</option>
        </select>
      </div>
      <p className="my-4 text-sm text-ink-soft" aria-live="polite">
        Showing {filtered.length} of {products.length} products
      </p>
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-10 text-center">
          <h2 className="text-xl">No matching products</h2>
          <p className="my-3 text-ink-soft">
            Try another name, ingredient or category.
          </p>
          <button
            className={btnGhost}
            onClick={() => {
              setSearch("");
              setCategory("all");
              setSeason("any");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div id="products-list">
        {view === "table" && filtered.length > 0 ? (
          <RecordList
            view="table"
            id="products-table"
            label="Products"
            columns={[
              "Product",
              "Category",
              "Price",
              "Volume",
              "Ingredients",
              "Season",
              "Actions",
            ]}
          >
            {filtered.map((product) => (
              <RecordRow key={product.slug}>
                <RecordCell label="Product" primary className="px-5 py-4">
                  <div className="flex min-w-[200px] items-center gap-3">
                    <ProductImagePreview
                      name={product.name}
                      imageUrl={product.imageUrl}
                    />
                    <span className="font-semibold">{product.name}</span>
                  </div>
                </RecordCell>
                <RecordCell
                  label="Category"
                  className="px-5 py-4 text-ink-soft"
                >
                  {humanize(product.kind)}
                </RecordCell>
                <RecordCell
                  label="Price"
                  className="whitespace-nowrap px-5 py-4 font-semibold text-leaf"
                >
                  {formatINR(product.priceINR)}
                </RecordCell>
                <RecordCell
                  label="Volume"
                  className="whitespace-nowrap px-5 py-4"
                >
                  {product.volumeMl} ml
                </RecordCell>
                <RecordCell
                  label="Ingredients"
                  className="min-w-[180px] px-5 py-4 text-ink-soft"
                >
                  {product.ingredients.join(" · ")}
                </RecordCell>
                <RecordCell
                  label="Season"
                  className="whitespace-nowrap px-5 py-4 text-ink-soft"
                >
                  {!product.season || product.season === "all"
                    ? "Year-round"
                    : humanize(product.season)}
                </RecordCell>
                <RecordCell label="Actions" className="px-5 py-4">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={() => {
                        setSelected(product);
                        setEditing(false);
                      }}
                    >
                      View details
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        aria-label={`Edit ${product.name}`}
                        className={btnGhost}
                        onClick={() => openEdit(product)}
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </RecordCell>
              </RecordRow>
            ))}
          </RecordList>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <article
                key={product.slug}
                className="flex flex-col rounded-2xl border border-line bg-paper p-5"
              >
                <div className="flex items-center gap-4">
                  <ProductImagePreview
                    name={product.name}
                    imageUrl={product.imageUrl}
                  />
                  <div className="min-w-0">
                    <h2 className="font-display text-lg leading-snug">
                      {product.name}
                    </h2>
                    <p className="mt-1 text-xs text-ink-soft">
                      {humanize(product.kind)} · {product.volumeMl} ml
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <strong className="font-display text-xl text-leaf">
                    {formatINR(product.priceINR)}
                  </strong>
                  <span className="text-xs text-ink-soft">
                    {product.recipe.length} ingredients in recipe
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-soft">
                  {product.ingredients.join(" · ")}
                </p>
                <div className="mb-4 mt-3 flex flex-wrap gap-1.5">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-cream-2 px-2.5 py-1 text-[11px] font-semibold text-leaf"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
                  <button
                    className={btnGhost}
                    onClick={() => {
                      setSelected(product);
                      setEditing(false);
                    }}
                  >
                    View details
                  </button>
                  {canEdit && (
                    <button
                      aria-label={`Edit ${product.name}`}
                      className={btnGhost}
                      onClick={() => openEdit(product)}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      <Drawer
        open={Boolean(selected) || editing}
        eyebrow={editing ? "Product editor" : "Product details"}
        title={
          editing
            ? selected
              ? `Edit ${selected.name}`
              : "Add product"
            : (selected?.name ?? "Product")
        }
        onClose={close}
        footer={
          editing ? (
            <>
              <button
                key="cancel-edit"
                type="button"
                className={btnGhost}
                disabled={pending}
                onClick={close}
              >
                Cancel
              </button>
              <button
                key="save-product"
                form="product-editor"
                type="submit"
                className={btnPrimary}
                disabled={pending || imagePending}
              >
                {pending ? "Saving…" : "Save to live menu"}
              </button>
            </>
          ) : (
            <>
              <button
                key="close-details"
                type="button"
                className={btnGhost}
                onClick={close}
              >
                Close
              </button>
              {canEdit && selected && (
                <button
                  key="edit-product"
                  type="button"
                  className={btnPrimary}
                  onClick={() => openEdit(selected)}
                >
                  Edit product
                </button>
              )}
            </>
          )
        }
      >
        {editing ? (
          <form
            id="product-editor"
            onInvalidCapture={(event) => {
              const section = (event.target as HTMLElement).closest("details");
              if (section) section.open = true;
            }}
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <p className="mb-5 rounded-xl bg-cream p-3 text-sm text-ink-soft">
              Saving updates the live menu. Existing orders keep their recorded
              prices.
            </p>
            <fieldset disabled={pending} className="space-y-4">
              <label className={labelCls}>
                Product name
                <input
                  className={inputCls}
                  required
                  maxLength={100}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      name: e.target.value,
                      ...(!selected
                        ? {
                            slug: e.target.value
                              .toLowerCase()
                              .trim()
                              .replace(/[^a-z0-9]+/g, "-")
                              .replace(/^-|-$/g, ""),
                          }
                        : {}),
                    })
                  }
                />
              </label>
              <ProductImagePicker
                value={draft.imageUrl}
                onChange={(imageUrl) =>
                  setDraft((current) => ({ ...current, imageUrl }))
                }
                onPendingChange={setImagePending}
              />
              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  Price (₹)
                  <input
                    className={inputCls}
                    type="number"
                    min="0.01"
                    max="100000"
                    step="0.01"
                    required
                    disabled={Boolean(selected) && !canChangePrice}
                    value={draft.priceINR || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, priceINR: Number(e.target.value) })
                    }
                  />
                </label>
                <label className={labelCls}>
                  Volume (ml)
                  <input
                    className={inputCls}
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    required
                    value={draft.volumeMl || ""}
                    onChange={(e) =>
                      setDraft({ ...draft, volumeMl: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <label className={labelCls}>
                Description
                <textarea
                  className={inputCls}
                  rows={3}
                  required
                  maxLength={1000}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                />
              </label>
              <label className={labelCls}>
                Category
                <select
                  className={inputCls}
                  value={draft.kind}
                  onChange={(e) =>
                    setDraft({ ...draft, kind: e.target.value as ProductKind })
                  }
                >
                  <option value="juice">Juice</option>
                  <option value="smoothie">Smoothie</option>
                  <option value="shot">Shot</option>
                </select>
              </label>
              <label className={labelCls}>
                Tags
                <input
                  className={inputCls}
                  value={tags}
                  placeholder="Bestseller, Seasonal"
                  onChange={(e) => setTags(e.target.value)}
                />
                <span className="mt-1 block text-xs font-normal text-ink-soft">
                  Separate tags with commas. Leave empty for none.
                </span>
              </label>
              <details className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  Ingredients and recipe
                </summary>
                <div className="mt-4 space-y-4">
                  <label className={labelCls}>
                    Ingredients shown to customers
                    <input
                      className={inputCls}
                      required
                      value={ingredients}
                      placeholder="Kale, Cucumber, Green apple, Lemon"
                      onChange={(e) => setIngredients(e.target.value)}
                    />
                    <span className="mt-1 block text-xs font-normal text-ink-soft">
                      Separate ingredient names with commas.
                    </span>
                  </label>
                  <fieldset className="border-t border-line pt-4">
                    <legend className="text-sm font-semibold">
                      Recipe per {draft.volumeMl || "—"} ml bottle
                    </legend>
                    <p className="my-2 text-xs text-ink-soft">
                      Quantities are raw material weights in grams.
                    </p>
                    <div className="space-y-3">
                      {draft.recipe.map((row, index) => (
                        <div
                          key={index}
                          className="flex flex-wrap items-end gap-2"
                        >
                          <label className="min-w-0 flex-1 text-xs">
                            Material
                            <select
                              className={`${inputCls} min-w-0`}
                              required
                              value={row.materialId}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  recipe: draft.recipe.map((r, i) =>
                                    i === index
                                      ? { ...r, materialId: e.target.value }
                                      : r,
                                  ),
                                })
                              }
                            >
                              <option value="">Select material</option>
                              {materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="w-24 text-xs">
                            Grams
                            <input
                              className={inputCls}
                              type="number"
                              required
                              min="0.01"
                              max="100000"
                              step="0.01"
                              value={row.grams || ""}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  recipe: draft.recipe.map((r, i) =>
                                    i === index
                                      ? { ...r, grams: Number(e.target.value) }
                                      : r,
                                  ),
                                })
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className={`${btnGhost} mb-1`}
                            aria-label={`Remove recipe row ${index + 1}`}
                            onClick={() =>
                              setDraft({
                                ...draft,
                                recipe: draft.recipe.filter(
                                  (_, i) => i !== index,
                                ),
                              })
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`${btnGhost} mt-3`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          recipe: [
                            ...draft.recipe,
                            { materialId: "", grams: 0 },
                          ],
                        })
                      }
                    >
                      + Add ingredient
                    </button>
                  </fieldset>
                </div>
              </details>
              <details className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  Advanced settings
                </summary>
                <div className="mt-4 space-y-4">
                  <label className={labelCls}>
                    Season
                    <select
                      className={inputCls}
                      value={draft.season ?? "all"}
                      onChange={(e) =>
                        setDraft({ ...draft, season: e.target.value as Season })
                      }
                    >
                      <option value="all">Year-round</option>
                      <option value="summer">Summer</option>
                      <option value="winter">Winter</option>
                    </select>
                  </label>
                  <label className={labelCls}>
                    Product URL name
                    <input
                      className={inputCls}
                      required
                      pattern="[a-z0-9]+(-[a-z0-9]+)*"
                      maxLength={100}
                      readOnly
                      placeholder="e.g. green-roots"
                      value={draft.slug}
                      onChange={(e) =>
                        setDraft({ ...draft, slug: e.target.value })
                      }
                    />
                    <span className="mt-1 block text-xs font-normal text-ink-soft">
                      {selected
                        ? "Kept fixed so existing links and orders continue to work."
                        : "Generated from the product name. Use a unique name."}
                    </span>
                  </label>
                </div>
              </details>
            </fieldset>
            {error && (
              <p role="alert" className="mt-4 text-sm text-carrot">
                {error}
              </p>
            )}
          </form>
        ) : (
          selected && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <ProductImagePreview
                  name={selected.name}
                  imageUrl={selected.imageUrl}
                />
                <div>
                  <p className="text-sm text-ink-soft">
                    {humanize(selected.kind)} · {selected.volumeMl} ml
                  </p>
                  <p className="mt-1 text-xl font-bold text-leaf">
                    {formatINR(selected.priceINR)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-ink-soft">{selected.description}</p>
              <div>
                <h3 className="font-semibold">Ingredients</h3>
                <p className="mt-2 text-sm">
                  {selected.ingredients.join(", ")}
                </p>
              </div>
              <div>
                <h3 className="font-semibold">Recipe per bottle</h3>
                <table className="mt-2 w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="py-2 font-medium">Material</th>
                      <th className="py-2 text-right font-medium">Grams</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.recipe.map((row) => (
                      <tr key={row.materialId} className="border-b border-line">
                        <td className="py-2">
                          {materials.find((m) => m.id === row.materialId)
                            ?.name ?? row.materialId}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {row.grams} g
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-ink-soft">
                Season:{" "}
                {selected.season === "summer"
                  ? "Summer"
                  : selected.season === "winter"
                    ? "Winter"
                    : "Year-round"}
              </p>
              <a
                className="inline-block text-sm font-semibold text-leaf underline"
                href={`${process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000"}/products/${selected.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                View on storefront ↗
              </a>
            </div>
          )
        )}
      </Drawer>
    </>
  );
}
