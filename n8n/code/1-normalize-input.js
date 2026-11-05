// ─────────────────────────────────────────────────────────────
// NODE: "Normalize Input"   (Code node · Run Once for All Items)
// Cleans what the website sent so every later step can rely on it.
// It does NOT decide whether the order is valid — "Process Order" does.
// ─────────────────────────────────────────────────────────────
const body = $input.first().json.body ?? {};
const customer = body.customer ?? {};
const clean = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

// Merge repeated products (2 lines of the same mouse → 1 line, qty 2)
const merged = {};
let blankLines = 0;
for (const line of Array.isArray(body.items) ? body.items : []) {
  const id = clean(String(line?.productId ?? '')).toLowerCase();
  if (!id) { blankLines++; continue; }
  merged[id] = (merged[id] ?? 0) + Number(line?.quantity);   // NaN is caught in Process Order
}
const items = Object.entries(merged).map(([productId, quantity]) => ({ productId, quantity }));

// A fingerprint of the cart, used to spot accidental double submissions
const signature = items.map((i) => `${i.productId}:${i.quantity}`).sort().join('|');

return [{
  json: {
    name: clean(customer.name),
    email: clean(customer.email).toLowerCase(),
    phone: clean(customer.phone),
    items,
    blank_lines: blankLines,
    product_ids: items.map((i) => i.productId),
    signature,
    received_at: new Date().toISOString(),
    raw: body,
  },
}];
