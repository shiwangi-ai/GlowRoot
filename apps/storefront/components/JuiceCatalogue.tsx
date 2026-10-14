"use client";

import { useState } from "react";
import type { Product } from "@glowroot/types";
import { ProductCard } from "@glowroot/ui";
import { ProductCardActions } from "./ProductCardActions";
const categories = [
  "All",
  "Single fruit",
  "Single vegetable",
  "Blends",
  "Smoothies",
  "Shots",
] as const;

type Category = (typeof categories)[number];
type SortOrder = "featured" | "price-low" | "price-high";

function getCategory(product: Product): Category {
  if (product.kind === "smoothie") return "Smoothies";
  if (product.kind === "shot") return "Shots";

  if (product.tags.includes("Single vegetable")) {
    return "Single vegetable";
  }

  if (product.tags.includes("Single fruit") || product.slug === "sugarcane") {
    return "Single fruit";
  }

  return "Blends";
}
export function JuiceCatalogue({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [sortOrder, setSortOrder] = useState<SortOrder>("featured");
  const query = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const searchableText = [product.name, ...product.ingredients]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(query);

    const matchesCategory =
      category === "All" || getCategory(product) === category;

    return matchesSearch && matchesCategory;
  });
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOrder === "price-low") {
      return a.priceINR - b.priceINR;
    }

    if (sortOrder === "price-high") {
      return b.priceINR - a.priceINR;
    }

    return 0;
  });
  return (
    <>
      <div className="mb-8">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_230px]">
          <div>
            <label
              htmlFor="catalogue-search"
              className="mb-2 block pl-5 text-sm font-semibold text-leaf"
            >
              Find your juice
            </label>

            <div className="relative w-full">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>

              <input
                id="catalogue-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search juices or ingredients"
                className="h-14 w-full rounded-full border border-line bg-paper pl-12 pr-5 text-ink outline-none transition-shadow placeholder:text-ink-soft focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="catalogue-sort"
              className="mb-2 block pl-5 text-sm font-semibold text-leaf"
            >
              Sort by
            </label>

            <div className="relative w-full">
              <select
                id="catalogue-sort"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value as SortOrder)
                }
                className="h-14 w-full cursor-pointer appearance-none rounded-full border border-line bg-paper pl-5 pr-12 text-ink outline-none transition-shadow focus:border-leaf focus:ring-2 focus:ring-leaf/20"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-leaf"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>
        <div
          role="group"
          aria-label="Filter products by category"
          className="mt-5 flex flex-wrap gap-2"
        >
          {categories.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={category === option}
              onClick={() => setCategory(option)}
              className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf focus-visible:ring-offset-2 ${
                category === option
                  ? "border-leaf bg-leaf text-white"
                  : "border-line bg-paper text-ink-soft hover:border-leaf hover:text-leaf"
              }`}
            >
              {option}
            </button>
          ))}

          {(query !== "" || category !== "All") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
              className="rounded-full px-3 py-2.5 text-sm font-semibold text-leaf underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </div>

        <p className="mt-5 text-sm text-ink-soft" role="status">
          Showing{" "}
          <span className="font-semibold text-ink">
            {filteredProducts.length}
          </span>{" "}
          {filteredProducts.length === 1 ? "product" : "products"}
        </p>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {sortedProducts.map((product) => (
            <ProductCard
              key={product.slug}
              product={product}
              hideDescription
              footer={<ProductCardActions product={product} />}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-paper p-8 text-center">
          <p>No juices match your search.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("All");
            }}
            className="mt-3 font-semibold text-leaf underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
