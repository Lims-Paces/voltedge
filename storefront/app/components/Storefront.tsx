"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/supabase";

const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG");
const BONUS_THRESHOLD = 500000;

type OrderResponse = {
  ok: boolean;
  orderRef?: string;
  status?: string;
  paymentStatus?: string;
  total?: number;
  bonus?: number;
  canPay?: boolean;
  message?: string;
  errors?: string[];
};

export default function Storefront({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OrderResponse | null>(null);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, q]) => q > 0)
        .map(([id, quantity]) => {
          const p = products.find((x) => x.id === id)!;
          return { ...p, quantity, lineTotal: p.price * quantity };
        }),
    [cart, products]
  );
  // Display only: n8n recalculates the real total from the database.
  const estimate = lines.reduce((s, l) => s + l.lineTotal, 0);

  const setQty = (id: string, q: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(99, q)) }));

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: form,
          // Only IDs and quantities are sent. Prices are never trusted from the browser.
          items: lines.map((l) => ({ productId: l.id, quantity: l.quantity })),
        }),
      });
      const data: OrderResponse = await res.json();
      setResult(data);
      if (data.ok) setCart({});
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <section className="panel success">
        <h2>{result.canPay ? "Order received 🎉" : "Order received, under review"}</h2>
        <p className="ref">
          Order reference: <strong>{result.orderRef}</strong>
        </p>
        <ul className="facts">
          <li>Order total: <strong>{naira(result.total ?? 0)}</strong></li>
          <li>Payment status: <strong>Awaiting payment</strong></li>
          {(result.bonus ?? 0) > 0 ? (
            <li>Promotional bonus: <strong>{naira(result.bonus!)} store credit, pending until payment is verified</strong></li>
          ) : (
            <li>Promotional bonus: not eligible (orders of ₦500,000+ qualify)</li>
          )}
        </ul>
        <p>{result.message}</p>
        {result.canPay && (
          <a className="btn" href={`/pay/${result.orderRef}`}>
            Pay {naira(result.total ?? 0)} with Paystack
          </a>
        )}
        <button className="btn ghost" onClick={() => setResult(null)}>Continue shopping</button>
      </section>
    );
  }

  return (
    <div className="layout">
      <section className="grid">
        {products.map((p) => (
          <article key={p.id} className="card">
            <div className="thumb" data-cat={p.category ?? ""}>
              {p.image_url ? <img src={p.image_url} alt={p.name} /> : <span>{p.category}</span>}
            </div>
            <h3>{p.name}</h3>
            <p className="price">{naira(p.price)}</p>
            <p className="stock">{p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</p>
            {cart[p.id] ? (
              <div className="qty">
                <button onClick={() => setQty(p.id, (cart[p.id] ?? 0) - 1)} aria-label="Decrease">−</button>
                <input
                  type="number"
                  min={0}
                  value={cart[p.id]}
                  onChange={(e) => setQty(p.id, parseInt(e.target.value || "0", 10))}
                  aria-label={`Quantity of ${p.name}`}
                />
                <button onClick={() => setQty(p.id, (cart[p.id] ?? 0) + 1)} aria-label="Increase">+</button>
              </div>
            ) : (
              <button className="btn" onClick={() => setQty(p.id, 1)}>Add to cart</button>
            )}
          </article>
        ))}
      </section>

      <aside className="panel cart">
        <h2>Your cart</h2>
        {lines.length === 0 ? (
          <p className="muted">Your cart is empty.</p>
        ) : (
          <>
            <ul className="lines">
              {lines.map((l) => (
                <li key={l.id}>
                  <span>{l.name} × {l.quantity}</span>
                  <span>{naira(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className="total">
              <span>Total</span> <strong>{naira(estimate)}</strong>
            </p>
            {estimate >= BONUS_THRESHOLD ? (
              <p className="bonus">Qualifies for a {naira(Math.round(estimate * 0.05))} store-credit bonus (activated after payment).</p>
            ) : (
              <p className="muted small">Add {naira(BONUS_THRESHOLD - estimate)} more to earn a 5% store-credit bonus.</p>
            )}
          </>
        )}

        <form onSubmit={placeOrder} className="checkout">
          <h3>Checkout</h3>
          <label>
            Full name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Phone (Nigerian mobile)
            <input
              type="tel"
              placeholder="0803 123 4567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </label>
          {result && !result.ok && (
            <div className="notice error">
              <p>{result.message}</p>
              {result.errors && (
                <ul>{result.errors.map((er) => <li key={er}>{er}</li>)}</ul>
              )}
            </div>
          )}
          <button className="btn" type="submit" disabled={submitting || lines.length === 0}>
            {submitting ? "Placing order…" : "Place order"}
          </button>
          <p className="muted small">You will pay securely with Paystack after your order is confirmed by email.</p>
        </form>
      </aside>
    </div>
  );
}
