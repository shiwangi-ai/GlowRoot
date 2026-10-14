"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import styles from "./BrandFilm.module.css";

const FILM = "/media/glowroot-story-vibrant-v2.mp4";
const POSTER = "/media/glowroot-story-poster.jpg";
const COVER = "/media/glowroot-story-cover-v2.webp";

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 4.8a1 1 0 0 1 1.5-.86l11 6.34a2 2 0 0 1 0 3.44L9.5 20.06A1 1 0 0 1 8 19.2Z" />
    </svg>
  );
}

function FilmDialog({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const titleId = useId();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    const player = video.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    // Playback is requested only after an explicit click. If a browser blocks
    // sound, its native play control remains available without muting the film.
    void player?.play().catch(() => {});
    return () => {
      player?.pause();
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div>
        <div className={styles.playerHeading}>
          <div>
            <p className={styles.eyebrow}>The GlowRoot story · 1 minute</p>
            <h2 id={titleId}>From field to bottle</h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close story video"
            autoFocus
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
        <video
          ref={video}
          controls
          playsInline
          preload="none"
          poster={POSTER}
          className={styles.video}
          onError={() => setFailed(true)}
        >
          <source src={FILM} type="video/mp4" />
          <track
            kind="captions"
            src="/media/glowroot-story.vtt"
            srcLang="en"
            label="English"
          />
          Your browser does not support this video.{" "}
          <a href={FILM}>Watch the film</a>.
        </video>
        {failed && (
          <p className={styles.error} role="alert">
            The film couldn’t load. <a href={FILM}>Open the video directly</a>{" "}
            or try again.
          </p>
        )}
        <details className={styles.transcript}>
          <summary>Read the story</summary>
          <p>
            Morning light falls over the fields. Carrots, beetroot and mango are
            gathered into a basket, washed with fresh water, and slowly pressed.
            Green and orange juice fills GlowRoot bottles before their caps
            close. A colourful collection of bottles appears, followed by
            flowing colours and ingredients gathering into the GlowRoot logo:
            Nature’s Palette.
          </p>
        </details>
      </div>
    </dialog>,
    document.body,
  );
}

/** The navbar links to the process section, where the feature opens the film. */
export function BrandFilm({ variant }: { variant: "badge" | "feature" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "badge" ? (
        <Link
          href="/#process"
          className={styles.badge}
          aria-label="Watch our story — go to How it's made"
          title="Watch our story · How it's made"
        >
          <span className={styles.badgeIcon}>
            <PlayIcon />
          </span>
          <span className={styles.badgeLabel}>
            Watch our
            <br />
            story
          </span>
        </Link>
      ) : (
        <button
          type="button"
          className={styles.feature}
          onClick={() => setOpen(true)}
          aria-label="Watch our story: From field to bottle — a one-minute GlowRoot film"
          aria-haspopup="dialog"
        >
          <span className={styles.featureCopy}>
            <Image
              src="/assets/glowroot-logo-trim.png"
              alt="GlowRoot"
              width={180}
              height={167}
              className={styles.featureLogo}
            />
            <span className={styles.featureCta}>
              <span className={styles.featurePlay}>
                <PlayIcon />
              </span>
              <span>
                Watch our story <small>1 minute</small>
              </span>
            </span>
          </span>
          <span className={styles.poster} aria-hidden="true">
            <Image
              src={COVER}
              alt=""
              fill
              sizes="(max-width: 700px) 100vw, 720px"
              className={styles.coverImage}
            />
          </span>
        </button>
      )}
      {open && <FilmDialog onClose={() => setOpen(false)} />}
    </>
  );
}
