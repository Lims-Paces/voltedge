"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/supabase";
import ProductArt from "./ProductArt";

const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG");
const BONUS_THRESHOLD = 500000;
const CATEGORY_ORDER = ["Laptops", "Phones", "Tablets", "Gaming", "Audio", "TVs", "Accessories"];

type OrderResponse = {
  ok: boolean;
  orderRef?: string;
  status?: string;
  total?: number;
  bonus?: number;
  canPay?: boolean;
  message?: string;
  errors?: string[];
};

export default function Storefront({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [drawer, setDrawer] = useState<"closed" | "cart" | "checkout">("closed");
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OrderResponse | null>(null);

  // Close the drawer with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer("closed");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const categories = useMemo(
    () => ["All", ...CATEGORY_ORDER.filter((c) => products.some((p) => p.category === c))],
    [products]
  );

  const visible = products.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      p.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, quantity]) => {
      const p = products.find((x) => x.id === id)!;
      return { ...p, quantity, lineTotal: p.price * quantity };
    });
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  // Display only. n8n recalculates the real total from the database.
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const charge = Math.min(subtotal / BONUS_THRESHOLD, 1);

  const setQty = (id: string, q: number) => setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(99, q)) }));
  const add = (id: string) => {
    setQty(id, (cart[id] ?? 0) + 1);
    setDrawer("cart");
  };

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
      if (data.ok) {
        setCart({});
        setDrawer("closed");
        window.scrollTo({ top: 0 });
      }
    } catch {
      setResult({ ok: false, message: "We couldn't reach the store. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const featured = products[0];

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <a href="/" className="logo" aria-label="VoltEdge Electronics home">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
            VoltEdge
          </a>
          <label className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              type="search"
              placeholder="Search phones, laptops, headphones"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products"
            />
          </label>
          <button className="cart-button" onClick={() => setDrawer("cart")} aria-label={`Open cart, ${count} items`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" /><circle cx="10" cy="20.5" r="1.3" /><circle cx="17" cy="20.5" r="1.3" /></svg>
            Cart
            {count > 0 && <span className="count">{count}</span>}
          </button>
        </div>
        <nav className="categories" aria-label="Categories">
          {categories.map((c) => (
            <button key={c} className={c === category ? "chip on" : "chip"} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </nav>
      </header>

      <main className="shop">
        {result?.ok && (
          <section className="confirmation" aria-live="polite">
            <div>
              <h1>{result.canPay ? "Order received" : "Order received, now under review"}</h1>
              <p className="confirmation-ref">Reference {result.orderRef}</p>
              <p>{result.message?.replace(/^Order received\.\s*/, "")}</p>
            </div>
            <dl className="confirmation-facts">
              <div><dt>Order total</dt><dd>{naira(result.total ?? 0)}</dd></div>
              <div><dt>Payment</dt><dd>Awaiting payment</dd></div>
              <div>
                <dt>Store credit</dt>
                <dd>{(result.bonus ?? 0) > 0 ? `${naira(result.bonus!)}, activates after payment` : "Not eligible"}</dd>
              </div>
            </dl>
            <div className="confirmation-actions">
              {result.canPay && (
                <a className="btn primary" href={`/pay/${result.orderRef}`}>Pay {naira(result.total ?? 0)} with Paystack</a>
              )}
              <button className="btn quiet" onClick={() => setResult(null)}>Keep shopping</button>
            </div>
          </section>
        )}

        {!result?.ok && category === "All" && !query && featured && (
          <section className="hero">
            <div className="hero-copy">
              <h1>Spend ₦500,000, get 5% back in store credit.</h1>
              <p>
                Laptops, phones, consoles and audio, priced in naira. Your credit activates the moment your Paystack
                payment is verified.
              </p>
              <button className="btn primary" onClick={() => add(featured.id)}>
                Add {featured.name} to cart
              </button>
            </div>
            <div className="hero-art">
              <ProductArt id={featured.id} category={featured.category} />
              <p className="hero-price">
                {featured.name}
                <strong>{naira(featured.price)}</strong>
              </p>
            </div>
          </section>
        )}

        <section aria-labelledby="catalogue-title">
          <div className="section-head">
            <h2 id="catalogue-title">{category === "All" ? "All products" : category}</h2>
            <p>{visible.length} {visible.length === 1 ? "item" : "items"}</p>
          </div>

          {visible.length === 0 ? (
            <p className="empty">Nothing matches “{query}”. Try a product name like “iPad” or “Sony”.</p>
          ) : (
            <ul className="grid">
              {visible.map((p) => (
                <li key={p.id} className="product">
                  <div className="product-image">
                    {p.image_url ? <img src={p.image_url} alt={p.name} /> : <ProductArt id={p.id} category={p.category} />}
                  </div>
                  <p className="product-cat">{p.category}</p>
                  <h3>{p.name}</h3>
                  <p className="product-price">{naira(p.price)}</p>
                  <p className={p.stock <= 5 ? "stock low" : "stock"}>
                    {p.stock === 0 ? "Out of stock" : p.stock <= 5 ? `Only ${p.stock} left` : "In stock"}
                  </p>
                  {cart[p.id] ? (
                    <div className="stepper" role="group" aria-label={`Quantity of ${p.name}`}>
                      <button onClick={() => setQty(p.id, cart[p.id] - 1)} aria-label="Remove one">−</button>
                      <span>{cart[p.id]} in cart</span>
                      <button onClick={() => setQty(p.id, cart[p.id] + 1)} aria-label="Add one">+</button>
                    </div>
                  ) : (
                    <button className="btn add" onClick={() => add(p.id)} disabled={p.stock === 0}>
                      Add to cart
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="promises" aria-label="How buying works">
          <div>
            <h3>Pay securely</h3>
            <p>Card, bank transfer or USSD through Paystack. We never see your card details.</p>
          </div>
          <div>
            <h3>Clear order updates</h3>
            <p>Every order gets a reference and an email confirmation, then a second email once payment is verified.</p>
          </div>
          <div>
            <h3>Store credit on big orders</h3>
            <p>Orders of ₦500,000 or more earn 5% back, activated after your payment is confirmed.</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <p className="logo small">VoltEdge Electronics</p>
          <p>Consumer electronics and gadgets, Lagos, Nigeria.</p>
        </div>
        <p>Questions about an order? Reply to your confirmation email and quote your order reference.</p>
      </footer>

      {/* ── Cart drawer ── */}
      <div className={drawer === "closed" ? "scrim" : "scrim open"} onClick={() => setDrawer("closed")} />
      <aside className={drawer === "closed" ? "drawer" : "drawer open"} aria-label="Cart" aria-hidden={drawer === "closed"}>
        <div className="drawer-head">
          <h2>{drawer === "checkout" ? "Checkout" : "Your cart"}</h2>
          <button className="icon-btn" onClick={() => setDrawer("closed")} aria-label="Close cart">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="drawer-empty">
            <p>Your cart is empty.</p>
            <button className="btn quiet" onClick={() => setDrawer("closed")}>Browse products</button>
          </div>
        ) : (
          <>
            <div className="meter" aria-live="polite">
              <div className="meter-bar"><span style={{ width: `${charge * 100}%` }} /></div>
              {subtotal >= BONUS_THRESHOLD ? (
                <p><strong>{naira(Math.round(subtotal * 0.05))} store credit</strong> unlocked. It activates once your payment is verified.</p>
              ) : (
                <p>Add <strong>{naira(BONUS_THRESHOLD - subtotal)}</strong> more to earn 5% store credit.</p>
              )}
            </div>

            {drawer === "cart" ? (
              <>
                <ul className="lines">
                  {lines.map((l) => (
                    <li key={l.id}>
                      <div className="line-art"><ProductArt id={l.id} category={l.category} /></div>
                      <div className="line-info">
                        <p className="line-name">{l.name}</p>
                        <p className="line-unit">{naira(l.price)} each</p>
                        <div className="stepper small">
                          <button onClick={() => setQty(l.id, l.quantity - 1)} aria-label={`Remove one ${l.name}`}>−</button>
                          <span>{l.quantity}</span>
                          <button onClick={() => setQty(l.id, l.quantity + 1)} aria-label={`Add one ${l.name}`}>+</button>
                        </div>
                      </div>
                      <p className="line-total">{naira(l.lineTotal)}</p>
                    </li>
                  ))}
                </ul>
                <div className="drawer-foot">
                  <p className="subtotal"><span>Subtotal</span><strong>{naira(subtotal)}</strong></p>
                  <button className="btn primary wide" onClick={() => setDrawer("checkout")}>Continue to checkout</button>
                </div>
              </>
            ) : (
              <form className="checkout" onSubmit={placeOrder}>
                <label>
                  Full name
                  <input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
                <label>
                  Email
                  <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </label>
                <label>
                  Phone
                  <input type="tel" autoComplete="tel" placeholder="0803 123 4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </label>

                <div className="summary">
                  {lines.map((l) => (
                    <p key={l.id}><span>{l.name} × {l.quantity}</span><span>{naira(l.lineTotal)}</span></p>
                  ))}
                  <p className="subtotal"><span>Total</span><strong>{naira(subtotal)}</strong></p>
                </div>

                {result && !result.ok && (
                  <div className="notice error" role="alert">
                    <p>{result.message}</p>
                    {result.errors && <ul>{result.errors.map((er) => <li key={er}>{er}</li>)}</ul>}
                  </div>
                )}

                <button className="btn primary wide" type="submit" disabled={submitting}>
                  {submitting ? "Placing order…" : `Place order for ${naira(subtotal)}`}
                </button>
                <p className="fine">You'll get an email confirmation, then pay securely with Paystack.</p>
                <button type="button" className="link-btn" onClick={() => setDrawer("cart")}>Back to cart</button>
              </form>
            )}
          </>
        )}
      </aside>
    </>
  );
}
