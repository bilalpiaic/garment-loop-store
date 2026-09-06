import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http";
import { requireAdmin } from "@/lib/platform";
import {
  extensionForImageType,
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGE_TYPES,
} from "@/lib/product-images";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin("products.manage");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
    }
    if (!PRODUCT_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Use a JPEG, PNG, WebP, GIF, or AVIF image." }, { status: 400 });
    }
    if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
      return NextResponse.json({ error: "Images must be 4.5 MB or smaller." }, { status: 400 });
    }
    const ext = extensionForImageType(file.type);
    if (!ext) {
      return NextResponse.json({ error: "Use a JPEG, PNG, WebP, GIF, or AVIF image." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${randomUUID()}.${ext}`;
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();

    if (token) {
      const pathname = `products/${filename}`;
      const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-content-type": file.type,
        },
        body: buffer,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: { message?: string } | string;
      };
      if (!response.ok || !payload.url) {
        const message =
          typeof payload.error === "string"
            ? payload.error
            : payload.error?.message ?? "Could not upload to Vercel Blob.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
      return NextResponse.json({ url: payload.url });
    }

    if (process.env.VERCEL) {
      return NextResponse.json(
        {
          error:
            "This host cannot save files locally. Add BLOB_READ_WRITE_TOKEN (Vercel Blob) or paste an HTTPS image URL.",
        },
        { status: 501 },
      );
    }

    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    return errorResponse(error);
  }
}
