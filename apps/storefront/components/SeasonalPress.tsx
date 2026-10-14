"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { Produce, Product } from "@glowroot/types";
import { formatINR } from "@glowroot/utils";
import styles from "./SeasonalPress.module.css";
import { IngredientArt } from "./IngredientArt";

const DURATION = 2800;
/** A short, local animation: no video download and no network-dependent add. */
export function SeasonalPress({
  item,
  product,
  onComplete,
  onCancel,
}: {
  item: Produce;
  product: Product;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const id = useId();
  const ingredients = product.ingredients.slice(0, 4);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => complete.current(), DURATION);
    return () => {
      window.clearTimeout(timer);
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={onCancel}
      style={
        { "--juice": item.ring.to, "--tint": item.ring.from } as CSSProperties
      }
    >
      <button
        className={styles.close}
        onClick={onCancel}
        aria-label="Cancel adding juice"
      >
        ×
      </button>
      <p className={styles.eyebrow}>From harvest to bottle</p>
      <h2 id={`${id}-title`} className={styles.title}>
        {product.name}
      </h2>
      <p id={`${id}-description`} className={styles.description}>
        Whole ingredients. One beautiful pressing.
      </p>
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.halo} />
        <div className={styles.ripple} />
        <div className={styles.ingredients}>
          {ingredients.map((ingredient, index) => (
            <div
              className={styles.ingredient}
              key={ingredient}
              style={
                {
                  "--x": `${(index - (ingredients.length - 1) / 2) * 76}px`,
                  "--tilt": `${(index % 2 ? 1 : -1) * 14}deg`,
                  "--delay": `${index * 60}ms`,
                } as CSSProperties
              }
            >
              <span className={styles.ingredientPhoto}>
                {item.group === "veg-blend" ? (
                  <IngredientArt name={ingredient} />
                ) : (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="60px"
                    className="object-cover"
                  />
                )}
              </span>
              <span>{ingredient}</span>
            </div>
          ))}
        </div>
        <svg className={styles.bottle} viewBox="0 0 300 300" fill="none">
          <defs>
            <clipPath id={`${id}-bottle`}>
              <path d="M130 93h40v23c0 14 30 19 30 42v102c0 10-7 17-17 17h-66c-10 0-17-7-17-17V158c0-23 30-28 30-42Z" />
            </clipPath>
            <linearGradient id={`${id}-glass`}>
              <stop stopColor="white" stopOpacity=".8" />
              <stop offset=".4" stopColor="white" stopOpacity=".15" />
              <stop offset="1" stopColor="white" stopOpacity=".7" />
            </linearGradient>
          </defs>
          <path
            d="M130 93h40v23c0 14 30 19 30 42v102c0 10-7 17-17 17h-66c-10 0-17-7-17-17V158c0-23 30-28 30-42Z"
            fill={`url(#${id}-glass)`}
            stroke="#779078"
            strokeWidth="2"
          />
          <g clipPath={`url(#${id}-bottle)`}>
            <g className={styles.liquid}>
              <path
                d="M90 145q15-7 30 0t30 0t30 0t30 0v145H90Z"
                fill="var(--juice)"
              />
              <path
                d="M111 158v101"
                stroke="white"
                strokeOpacity=".35"
                strokeWidth="7"
                strokeLinecap="round"
              />
            </g>
          </g>
          <path
            className={styles.stream}
            d="M150 60v181"
            stroke="var(--juice)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <g className={styles.label}>
            <rect
              x="108"
              y="182"
              width="84"
              height="61"
              rx="3"
              fill="#fbf7eb"
            />
            <path d="M144 191q19-8 13 5-9 8-13-5" fill="#52783c" />
            <text
              x="150"
              y="213"
              textAnchor="middle"
              fill="#2f5d34"
              fontSize="15"
              fontFamily="Georgia"
            >
              GlowRoot
            </text>
            <text
              x="150"
              y="228"
              textAnchor="middle"
              fill="#5b7046"
              fontSize="6"
              letterSpacing="1.3"
            >
              COLD PRESSED
            </text>
          </g>
          <rect
            className={styles.cap}
            x="125"
            y="82"
            width="50"
            height="14"
            rx="4"
            fill="#2f5d34"
          />
        </svg>
        <div className={styles.finished}>
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="340px"
            priority
            className="object-contain"
          />
        </div>
        <span className={styles.seal}>✓ &nbsp; Made of the good stuff</span>
      </div>
      <div className={styles.status} aria-hidden="true">
        <span>Gathering the goodness…</span>
        <span>Pressing &amp; pouring…</span>
        <span>Bottled. Ready for your basket.</span>
      </div>
      <p className={styles.price}>
        {formatINR(product.priceINR)}{" "}
        <span>· {product.volumeMl} ml bottle</span>
      </p>
      <div className={styles.progress} aria-hidden="true">
        <span />
      </div>
      <button className={styles.skip} onClick={onComplete}>
        Skip &amp; add to cart <span aria-hidden="true">↗</span>
      </button>
    </dialog>,
    document.body,
  );
}
