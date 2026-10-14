"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { btnGhost, btnPrimary, selectCls } from "@/components/ui/form";

export function ProductImagePicker({
  value,
  onChange,
  onPendingChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fit, setFit] = useState("contain");
  const [position, setPosition] = useState("centre");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    onPendingChange(Boolean(file) || uploading);
    return () => onPendingChange(false);
  }, [file, uploading, onPendingChange]);
  async function upload() {
    if (!file || uploading) return;
    const controller = new AbortController();
    request.current = controller;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      body.append("fit", fit);
      body.append("position", position);
      const response = await fetch("/api/product-images", {
        method: "POST",
        body,
        signal: controller.signal,
      });
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          response.redirected
            ? "Your session has expired. Sign in again before uploading."
            : "The image service is unavailable. Please try again.",
        );
      const result = await response.json();
      if (!response.ok || !result.imageUrl)
        throw new Error(result.error || "Upload failed. Please try again.");
      if (controller.signal.aborted) return;
      onChange(result.imageUrl);
      setFile(null);
    } catch (problem) {
      if (controller.signal.aborted) return;
      setError(
        problem instanceof Error
          ? problem.message
          : "Upload failed. Please try again.",
      );
    } finally {
      if (!controller.signal.aborted) setUploading(false);
    }
  }
  const source = preview || value;
  return (
    <section aria-label="Product image" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Product image</h3>
        <button
          type="button"
          className={btnGhost}
          disabled={uploading}
          onClick={() => input.current?.click()}
        >
          {value || file ? "Change image" : "Upload image"}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        className="sr-only"
        aria-label="Choose product image"
        accept="image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          event.target.value = "";
          if (!chosen) return;
          if (
            !["image/jpeg", "image/png", "image/webp"].includes(chosen.type) ||
            chosen.size > 10 * 1024 * 1024
          ) {
            setError("Choose a JPG, PNG or WebP image smaller than 10 MB.");
            return;
          }
          setError("");
          setFit("contain");
          setPosition("centre");
          setFile(chosen);
        }}
      />
      <div className="relative aspect-[11/6] overflow-hidden rounded-xl border border-line bg-[#efe6cf]">
        {source ? (
          <Image
            src={source}
            alt="Product image preview"
            fill
            unoptimized
            sizes="460px"
            style={{
              objectFit: file ? (fit as "contain" | "cover") : "contain",
              objectPosition: file
                ? position === "north"
                  ? "center top"
                  : position === "south"
                    ? "center bottom"
                    : "center center"
                : "center",
            }}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-ink-soft">
            Choose a photo for this product
          </div>
        )}
      </div>
      {file ? (
        <>
          <p className="break-all text-xs text-ink-soft">{file.name}</p>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs">
              Framing
              <select
                className={`${selectCls} mt-1 block`}
                disabled={uploading}
                value={fit}
                onChange={(e) => setFit(e.target.value)}
              >
                <option value="contain">Fit entire image</option>
                <option value="cover">Fill card (crop edges)</option>
              </select>
            </label>
            {fit === "cover" && (
              <label className="text-xs">
                Image position
                <select
                  className={`${selectCls} mt-1 block`}
                  disabled={uploading}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  <option value="centre">Centre</option>
                  <option value="north">Top</option>
                  <option value="south">Bottom</option>
                </select>
              </label>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={uploading}
              onClick={upload}
            >
              {uploading ? "Uploading…" : "Use image"}
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={uploading}
              onClick={() => {
                setFile(null);
                setError("");
              }}
            >
              Cancel image change
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-ink-soft">
          JPG, PNG or WebP · Up to 10 MB. Image changes are published when you
          save the product.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-carrot">
          {error}
        </p>
      )}
    </section>
  );
}
