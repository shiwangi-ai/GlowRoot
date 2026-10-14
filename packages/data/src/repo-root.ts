/**
 * Where the shared JSON stores live (Node runtime only).
 *
 * The storefront and the admin run as two Next.js processes, so anything they
 * both read has to sit at the workspace root rather than inside either app.
 */
import { existsSync } from "fs";
import path from "path";

/** Walk up from cwd to the workspace root (where pnpm-workspace.yaml lives). */
export function repoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // fallback: two levels up (apps/* -> repo root)
  return path.join(process.cwd(), "..", "..");
}

/** Absolute path of a root-level store file, e.g. `.glowroot-zones.json`. */
export function dataFile(name: string): string {
  return path.join(repoRoot(), name);
}
