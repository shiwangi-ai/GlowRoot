import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { dataFile } from "./repo-root";

const imageName = /^[a-f0-9-]{36}\.webp$/;
export const isUploadedProductImage = (url: string) =>
  /^\/media\/products\/[a-f0-9-]{36}\.webp$/.test(url);
const directory = () => dataFile("uploads/product-images");
export async function readProductImage(name: string) {
  if (!imageName.test(name)) throw new Error("Invalid image name.");
  return fs.readFile(path.join(directory(), name));
}
export async function storeProductImage(
  bytes: Buffer,
  fit: string,
  position: string,
): Promise<string> {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024)
    throw new Error("Choose an image smaller than 10 MB.");
  if (
    !["contain", "cover"].includes(fit) ||
    !["centre", "north", "south"].includes(position)
  )
    throw new Error("Invalid image framing.");
  const options = { limitInputPixels: 40000000, failOn: "error" as const };
  const metadata = await sharp(bytes, options).metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
    (metadata.pages ?? 1) > 1
  )
    throw new Error("Choose a still JPG, PNG or WebP image.");
  // Re-encode and strip metadata. Both apps use this same landscape image.
  const optimized = await sharp(bytes, options)
    .rotate()
    .resize(1320, 720, {
      fit: fit as "contain" | "cover",
      position,
      background: "#efe6cf",
    })
    .webp({ quality: 86 })
    .toBuffer();
  await fs.mkdir(directory(), { recursive: true });
  const name = `${randomUUID()}.webp`;
  await fs.writeFile(path.join(directory(), name), optimized, { flag: "wx" });
  return `/media/products/${name}`;
}

export async function productImageResponse(name: string): Promise<Response> {
  if (!imageName.test(name)) return new Response("Not found", { status: 404 });
  try {
    const bytes = await readProductImage(name);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return new Response("Not found", { status: 404 });
    throw error;
  }
}
