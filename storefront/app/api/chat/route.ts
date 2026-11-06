import { NextResponse } from "next/server";

// Forwards a chat message to the n8n support workflow (AI agent).
export async function POST(req: Request) {
  const { sessionId, message } = await req.json().catch(() => ({}));
  if (typeof message !== "string" || !message.trim() || message.length > 500) {
    return NextResponse.json({ reply: "Please type a question (up to 500 characters)." }, { status: 400 });
  }
  try {
    const res = await fetch(process.env.N8N_SUPPORT_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-voltedge-key": process.env.N8N_WEBHOOK_SECRET! },
      body: JSON.stringify({ sessionId: String(sessionId ?? "anon").slice(0, 64), message: message.trim() }),
      signal: AbortSignal.timeout(45000),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ reply: data.reply ?? "Sorry, I couldn't answer that. Please try again." });
  } catch {
    return NextResponse.json({ reply: "The assistant is unavailable right now. Please try again shortly." }, { status: 502 });
  }
}
