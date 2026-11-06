"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { from: "you" | "assistant"; text: string };

const STARTERS = ["Is the PS5 Slim in stock?", "Which items qualify for store credit?", "Check my order status"];

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "assistant", text: "Hi! I can answer questions about our products, prices and stock, or check an order if you share its reference and email." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())
  );
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((m) => [...m, { from: "you", text: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { from: "assistant", text: data.reply || "Sorry, I couldn't answer that. Please try again." }]);
    } catch {
      setMessages((m) => [...m, { from: "assistant", text: "I can't connect right now. Please try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="chat-launcher" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close help chat" : "Open help chat"}>
        {open ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        ) : (
          <>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
            Ask VoltEdge
          </>
        )}
      </button>

      {open && (
        <section className="chat" aria-label="Help chat">
          <header className="chat-head">
            <h2>Ask VoltEdge</h2>
            <p>Answers come from our live product list and your order record.</p>
          </header>
          <div className="chat-log" aria-live="polite">
            {messages.map((m, i) => (
              <p key={i} className={m.from === "you" ? "bubble you" : "bubble"}>{m.text}</p>
            ))}
            {busy && <p className="bubble typing">Checking…</p>}
            {messages.length === 1 && (
              <div className="starters">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question"
              maxLength={500}
              aria-label="Your question"
            />
            <button type="submit" disabled={busy || !input.trim()}>Send</button>
          </form>
        </section>
      )}
    </>
  );
}
