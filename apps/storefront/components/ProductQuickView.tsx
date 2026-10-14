"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@glowroot/types";
import { ProductInformation } from "./ProductInformation";
import { ProductPurchaseControls } from "./ProductPurchaseControls";
import styles from "./ProductQuickView.module.css";

function QuickView({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const overlay = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const previousMarker = document.body.getAttribute(
      "data-product-quick-view-open",
    );
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    // Keep the existing cart/flying bubble in their original DOM locations so
    // their animations remain visible. Background controls still become inert.
    const background = Array.from(document.body.children)
      .filter(
        (node): node is HTMLElement =>
          node instanceof HTMLElement && node !== overlay.current,
      )
      .map((node) => ({ node, inert: node.inert }));
    background.forEach(({ node }) => {
      node.inert = true;
    });
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    }
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-product-quick-view-open", "");
    closeButton.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]',
        ) ?? [],
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      background.forEach(({ node, inert }) => {
        node.inert = inert;
      });
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (previousMarker === null)
        document.body.removeAttribute("data-product-quick-view-open");
      else
        document.body.setAttribute(
          "data-product-quick-view-open",
          previousMarker,
        );
      if (previousFocus?.isConnected)
        previousFocus.focus({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={overlay}
      className={styles.overlay}
      data-product-quick-view
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.panel}
      >
        <div className={styles.header}>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className={styles.close}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.image}>
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 90vw, 400px"
              className="object-cover"
            />
          </div>
          <div>
            <ProductInformation product={product} titleId={titleId} />
            <ProductPurchaseControls product={product} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2 text-sm">
              <Link
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="min-h-11 inline-flex items-center text-ink-soft underline underline-offset-4 focus-visible:outline-leaf"
              >
                Full product page ↗
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ProductDetailsButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        aria-label={`View details for ${product.name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center px-4 py-[14px] rounded-full border-[1.5px] border-line text-[15px] font-semibold hover:border-leaf hover:text-leaf transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        Details
      </button>
      {open && <QuickView product={product} onClose={close} />}
    </>
  );
}
