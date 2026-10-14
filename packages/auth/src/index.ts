/**
 * Credential and token primitives shared by the storefront and the admin app.
 *
 * This is deliberately the *only* implementation of password hashing in the
 * repo — `@glowroot/data`'s user store re-exports these rather than keeping a
 * second copy, so the two never drift and a stored digest stays portable
 * between them.
 *
 * Node runtime only: it uses `crypto`. Never import from a client component.
 */
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const ITERATIONS = 120_000;
const KEYLEN = 32;
const DIGEST = "sha256";

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** "<salt>:<digest>", both hex. Stable format — do not change without a migration. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const digest = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return `${salt.toString("hex")}:${digest.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, digestHex] = stored.split(":");
  if (!saltHex || !digestHex) return false;
  const expected = Buffer.from(digestHex, "hex");
  const actual = pbkdf2Sync(
    password,
    Buffer.from(saltHex, "hex"),
    ITERATIONS,
    KEYLEN,
    DIGEST,
  );
  // Lengths must match before timingSafeEqual, which throws otherwise.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * A single-use secret handed to exactly one person: a session cookie, an
 * invitation link, a reset link. 32 bytes of CSPRNG output, carrying no claims.
 */
export function newToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * What gets persisted. Storing only the digest means a leaked table cannot be
 * replayed as a login — the same reasoning as password hashing. 64 hex chars,
 * which is why every `token_hash` column is VARCHAR(64).
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Minimum acceptable password. Deliberately length-first, no composition rules. */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (password.length > 200) return "Use fewer than 200 characters.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Include at least one letter and one number.";
  }
  return null;
}
