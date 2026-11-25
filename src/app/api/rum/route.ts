import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const rumSchema = z.object({
  name: z.enum(["LCP", "CLS", "INP", "FCP", "TTFB"]),
  value: z.number(),
  rating: z.enum(["good", "needs-improvement", "poor"]).optional(),
  id: z.string().optional(),
  path: z.string().optional(),
});

const MAX_ENTRIES = 50;
const rumBuffer: Array<z.infer<typeof rumSchema> & { at: string }> = [];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = rumSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid RUM payload." }, { status: 400 });
  }
  const entry = { ...parsed.data, at: new Date().toISOString() };
  rumBuffer.push(entry);
  if (rumBuffer.length > MAX_ENTRIES) rumBuffer.splice(0, rumBuffer.length - MAX_ENTRIES);
  if (process.env.NODE_ENV !== "production") {
    console.info("[rum]", entry.name, Math.round(entry.value), entry.rating ?? "", entry.path ?? "");
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }
  return NextResponse.json({ entries: rumBuffer.slice(-MAX_ENTRIES) });
}
