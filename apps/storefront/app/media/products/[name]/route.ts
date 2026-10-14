import { productImageResponse } from "@glowroot/data/product-images";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  return productImageResponse((await params).name);
}
