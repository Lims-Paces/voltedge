import { NextResponse } from "next/server";

// Forwards the order to n8n. The webhook URL and secret stay on the server,
// so they never appear in the browser. All validation happens in n8n,
// so even a bad submission is received, saved and flagged there.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  try {
    const res = await fetch(process.env.N8N_ORDER_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-voltedge-key": process.env.N8N_WEBHOOK_SECRET!,
      },
      body: JSON.stringify({ ...(body as object), source: "voltedge-storefront", submittedAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({ ok: false, message: "Unexpected response from order system." }));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Our order system is temporarily unavailable. Please try again shortly." },
      { status: 502 }
    );
  }
}
