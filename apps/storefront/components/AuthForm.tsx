"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@glowroot/ui";
import { useAuth } from "./AuthProvider";
import { signIn, signUp } from "@/app/login/actions";

type Mode = "login" | "signup";

const inputCls =
  "w-full rounded-xl border border-line bg-cream px-3.5 py-3 text-[15px] outline-none " +
  "transition-colors focus:border-leaf placeholder:text-ink-soft/60";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const iconCls = "w-4 h-4";

/** Delivery truck — "orders, with delivery status". */
function DeliveryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={iconCls}
    >
      <path d="M2.5 6.5h11v9h-11z" strokeLinejoin="round" />
      <path d="M13.5 9.5h3.6l3 3v3h-6.6z" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="1.9" />
      <circle cx="16.5" cy="17.5" r="1.9" />
    </svg>
  );
}

/** Repeat arrows — "one-tap reorder". */
function ReorderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={iconCls}
    >
      <path
        d="M17 2l3.5 3.5L17 9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.5 11V9.5A4 4 0 0 1 7.5 5.5h13" strokeLinecap="round" />
      <path
        d="M7 22l-3.5-3.5L7 15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20.5 13v1.5a4 4 0 0 1-4 4h-13" strokeLinecap="round" />
    </svg>
  );
}

/** Map pin — "saved addresses & pincode". */
function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={iconCls}
    >
      <path
        d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

const perks = [
  { Icon: DeliveryIcon, text: "See past & live orders, with delivery status" },
  { Icon: ReorderIcon, text: "One-tap reorder of your go-to blends" },
  { Icon: LocationIcon, text: "Saved addresses & pincode for faster checkout" },
];

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();

  // Where to land after signing in. `?next=` is set by the links that send
  // people here (checkout, order history); it's kept relative so the param
  // can't be used to bounce someone off-site.
  const nextParam = searchParams.get("next") ?? "";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/account/orders";

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);

  const login = mode === "login";

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!login && !name.trim()) e.name = "Name is required.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!emailRe.test(email.trim()))
      e.email = "Enter a valid email address.";
    if (!password) e.password = "Password is required.";
    else if (!login && password.length < 8)
      e.password = "Use at least 8 characters.";
    return e;
  }, [login, name, email, password]);

  const errorFor = (field: string) => (attempted ? errors[field] : undefined);

  function switchMode(next: Mode) {
    setMode(next);
    setFormError(null);
    setAttempted(false);
  }

  async function submit() {
    setAttempted(true);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const res = login
      ? await signIn(email, password)
      : await signUp({ name, email, phone, password });
    setSubmitting(false);

    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    auth.signIn(res.customer);
    router.push(next);
  }

  return (
    <div className="mx-auto max-w-[1000px] grid md:grid-cols-2 overflow-hidden rounded-3xl border border-line bg-paper shadow-card">
      {/* brand panel */}
      <aside className="relative flex min-h-[520px] flex-col justify-center gap-12 overflow-hidden bg-leaf-deep p-10 text-[#f4efe0]">
        {/* faint logo watermark behind the content */}
        <Image
          src="/assets/glowroot-logo-trim.png"
          alt=""
          aria-hidden
          width={520}
          height={470}
          className="pointer-events-none absolute -bottom-10 -right-12 w-[360px] max-w-none select-none opacity-[0.06] blur-[1px]"
        />

        {/* hero copy */}
        <div className="relative">
          <p className="font-script text-[40px] font-bold leading-none text-gold">
            {login ? "welcome back" : "hello there"}
          </p>
          <h1 className="mt-2.5 font-display text-[35px] font-bold leading-[1.04] tracking-[-0.02em] text-[#fbf8f0] text-balance">
            {login
              ? "Your juice, your history — all in one place."
              : "Join GlowRoot — fresh-pressed, delivered."}
          </h1>
        </div>

        {/* perks */}
        <ul className="relative flex flex-col gap-4">
          {perks.map(({ Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 text-[14.5px] text-[#f4efe0]/90"
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-gold/15 text-[#f0c765]">
                <Icon />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>

      {/* form side */}
      <section className="p-8 sm:p-10">
        <div className="mb-7 inline-flex gap-1 rounded-full border border-line bg-cream p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-full px-5 py-2.5 text-[14px] font-bold transition-colors ${
              login
                ? "bg-leaf text-white shadow-[0_8px_18px_-10px_rgba(25,61,32,.7)]"
                : "text-ink-soft"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded-full px-5 py-2.5 text-[14px] font-bold transition-colors ${
              !login
                ? "bg-leaf text-white shadow-[0_8px_18px_-10px_rgba(25,61,32,.7)]"
                : "text-ink-soft"
            }`}
          >
            Create account
          </button>
        </div>

        <h2 className="font-display text-[24px] font-bold text-ink">
          {login ? "Log in" : "Create your account"}
        </h2>
        <p className="mb-6 mt-1 text-[14.5px] text-ink-soft">
          {login
            ? "Welcome back — enter your details to continue."
            : "Takes a few seconds — then your orders follow you."}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          {!login && (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-bold text-ink">
                Full name
              </span>
              <input
                className={inputCls}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
              />
              {errorFor("name") && (
                <span className="mt-1 block text-[12px] text-carrot">
                  {errorFor("name")}
                </span>
              )}
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-bold text-ink">
              Email
            </span>
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errorFor("email") && (
              <span className="mt-1 block text-[12px] text-carrot">
                {errorFor("email")}
              </span>
            )}
          </label>

          {!login && (
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-bold text-ink">
                Phone{" "}
                <span className="font-medium text-ink-soft">(optional)</span>
              </span>
              <input
                className={inputCls}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="For delivery updates"
                autoComplete="tel"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] font-bold text-ink">Password</span>
              {login && (
                <span className="cursor-pointer text-[12.5px] font-semibold text-carrot">
                  Forgot?
                </span>
              )}
            </span>
            <span className="relative block">
              <input
                className={`${inputCls} pr-16`}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={login ? "Your password" : "At least 8 characters"}
                autoComplete={login ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-ink-soft"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </span>
            {errorFor("password") && (
              <span className="mt-1 block text-[12px] text-carrot">
                {errorFor("password")}
              </span>
            )}
          </label>

          {formError && (
            <p className="rounded-xl border border-carrot/30 bg-carrot/10 px-3.5 py-2.5 text-[13px] text-carrot">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={submitting} className="mt-1 w-full">
            {submitting
              ? "Just a moment…"
              : login
                ? "Log in"
                : "Create account"}
          </Button>
        </form>

        {login && (
          <>
            <div className="my-5 flex items-center gap-3.5 text-[12.5px] text-ink-soft">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <Button href="/" variant="ghost" className="w-full">
              Continue as guest
            </Button>
          </>
        )}

        <p className="mt-6 text-center text-[14px] text-ink-soft">
          {login ? (
            <>
              New to GlowRoot?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="font-bold text-carrot"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-bold text-carrot"
              >
                Log in
              </button>
            </>
          )}
        </p>
      </section>
    </div>
  );
}
