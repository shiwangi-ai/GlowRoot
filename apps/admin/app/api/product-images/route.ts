import { NextRequest, NextResponse } from "next/server";
import { checkPermission } from "@/lib/access";
import { storeProductImage } from "@glowroot/data/product-images";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const access = await checkPermission("catalogue.publish");
  if (!access.ok)
    return NextResponse.json({ error: access.error }, { status: 403 });
  if (
    !["catalogue.edit", "catalogue.create"].some((p) =>
      access.identity.permissions.has(p),
    )
  )
    return NextResponse.json(
      { error: "You do not have permission to upload product images." },
      { status: 403 },
    );
  const limit = 11 * 1024 * 1024;
  try {
    // Bound the multipart body before parsing, including chunked requests.
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Choose an image to upload.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Choose an image smaller than 10 MB." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    }).formData();
    const file = form.get("image");
    if (!(file instanceof File)) throw new Error("Choose an image to upload.");
    const imageUrl = await storeProductImage(
      Buffer.from(await file.arrayBuffer()),
      String(form.get("fit") ?? "contain"),
      String(form.get("position") ?? "centre"),
    );
    await recordAudit({
      actorUserId: access.identity.id,
      action: "catalogue.image_uploaded",
      targetType: "product_image",
      targetId: imageUrl,
    });
    return NextResponse.json({ imageUrl });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not upload this image. Use a still JPG, PNG or WebP under 10 MB and 40 megapixels, then try again.",
      },
      { status: 400 },
    );
  }
}
