"use client";

import Image from "next/image";
import { useRef } from "react";

export function ProductImagePreview({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={`Preview image of ${name}`}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-line bg-cream-2 transition-colors hover:border-leaf focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
      >
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="64px"
          className="object-contain p-1"
        />
      </button>
      <dialog
        ref={dialog}
        aria-label={`${name} image preview`}
        onClose={() => trigger.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            ) {
              event.currentTarget.close();
            }
          }
        }}
        className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-line bg-paper p-0 text-ink shadow-xl backdrop:bg-black/40"
      >
        <div className="relative aspect-[11/6] w-full overflow-hidden bg-cream-2">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 416px) calc(100vw - 32px), 384px"
            className="object-contain"
          />
          <button
            type="button"
            autoFocus
            aria-label="Close image preview"
            onClick={() => dialog.current?.close()}
            className="absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-paper text-2xl leading-none text-ink shadow-sm transition-colors hover:bg-cream-2 hover:text-leaf focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </dialog>
    </>
  );
}
