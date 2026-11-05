// ─────────────────────────────────────────────────────────────
// NODE: "Process Order"   (Code node · Run Once for All Items)
// All business rules live here, in plain deterministic code:
//   validation → pricing from the DATABASE → 5% bonus rule →
//   review checks → customer type → tags → order reference.
// No AI is involved in any number or status.
// ─────────────────────────────────────────────────────────────
const BONUS_THRESHOLD = 500000;      // ₦500,000
const BONUS_RATE = 0.05;             // 5% store credit
const MAX_QTY_PER_ITEM = 5;          // above this → manual review
const UNUSUAL_ORDER_VALUE = 10000000; // ₦10m → manual review
const VIP_LIFETIME_PAID = 3000000;   // ₦3m paid in total → VIP
const VIP_PAID_ORDERS = 3;           // or 3+ paid orders → VIP

const input = $('Normalize Input').first().json;
const productRows = $('Get Products').first().json.products ?? [];
const history = $('Get Customer History').first().json ?? {};

const errors = [];    // missing/invalid info  → INCOMPLETE_ORDER
const warnings = [];  // valid but suspicious  → REVIEW_REQUIRED
const tags = new Set();

// ── 1. Validate customer details ─────────────────────────────
if (input.name.length < 2) errors.push('Customer name is missing');
else if (input.name.length > 80 || /\d/.test(input.name)) errors.push('Customer name looks invalid');

if (!input.email) errors.push('Email address is missing');
else if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(input.email)) errors.push('Email address is invalid');

// Nigerian mobile numbers: 0803…, +234803…, 234803…  → stored as +234803…
let phone = null;
const digits = input.phone.replace(/[^\d+]/g, '');
const local = digits.replace(/^\+?234/, '').replace(/^0/, '');
if (!input.phone) errors.push('Phone number is missing');
else if (!/^[789][01]\d{8}$/.test(local)) errors.push('Phone number must be a valid Nigerian mobile number');
else phone = '+234' + local;

// ── 2. Validate and price the items (prices come from the database) ──
const products = Object.fromEntries(productRows.map((p) => [p.id, p]));
if (input.items.length === 0) errors.push('No products in the order');
if (input.blank_lines > 0) errors.push('One or more order lines had no product');

const lines = [];
for (const { productId, quantity } of input.items) {
  const p = products[productId];
  if (!p || p.active === false) { errors.push(`Unknown product: ${productId}`); continue; }
  if (!Number.isInteger(quantity) || quantity < 1) { errors.push(`Invalid quantity for ${p.name}`); continue; }

  const unitPrice = Number(p.price);
  lines.push({
    product_id: p.id,
    product_name: p.name,
    quantity,
    unit_price: unitPrice,
    line_total: unitPrice * quantity,
  });

  // ── 3. Review checks (inventory + suspicious patterns) ──
  if (quantity > Number(p.stock)) {
    warnings.push(`Only ${p.stock} × ${p.name} in stock, customer requested ${quantity}`);
    tags.add('INSUFFICIENT_STOCK');
  }
  if (quantity > MAX_QTY_PER_ITEM) {
    warnings.push(`Unusually large quantity: ${quantity} × ${p.name}`);
    tags.add('UNUSUAL_QUANTITY');
  }
}

const totalAmount = lines.reduce((sum, l) => sum + l.line_total, 0);
const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

// ── 4. Promotional bonus rule (₦500,000+ → 5%, pending until paid) ──
//    An incomplete order can't be paid, so it earns no bonus.
const bonusEligible = errors.length === 0 && totalAmount >= BONUS_THRESHOLD;
const bonusAmount = bonusEligible ? Math.round(totalAmount * BONUS_RATE) : 0;

// ── 5. More review checks using the customer's history ──
if (totalAmount > UNUSUAL_ORDER_VALUE) {
  warnings.push(`Order value above ₦${UNUSUAL_ORDER_VALUE.toLocaleString('en-NG')}`);
  tags.add('UNUSUAL_ORDER_VALUE');
}
if (Number(history.recent_duplicates) > 0) {
  warnings.push('Same customer submitted the same items in the last 10 minutes (possible duplicate)');
  tags.add('POSSIBLE_DUPLICATE');
}
if (phone && history.last_phone && history.last_phone !== phone) {
  warnings.push(`Phone number differs from this customer's previous order (${history.last_phone})`);
  tags.add('DETAILS_MISMATCH');
}

// ── 6. Customer type ──
const previousOrders = Number(history.previous_orders ?? 0);
let customerType = 'NEW_CUSTOMER';
if (previousOrders > 0) customerType = 'RETURNING_CUSTOMER';
if (Number(history.lifetime_paid ?? 0) >= VIP_LIFETIME_PAID || Number(history.paid_orders ?? 0) >= VIP_PAID_ORDERS) {
  customerType = 'VIP_CUSTOMER';
}

// ── 7. Route, statuses and tags ──
let route, orderStatus;
if (errors.length > 0) {
  route = 'incomplete';
  orderStatus = 'INCOMPLETE';
  tags.clear();               // review tags don't matter until the info is complete
  tags.add('INCOMPLETE_ORDER');
} else if (warnings.length > 0) {
  route = 'review';
  orderStatus = 'UNDER_REVIEW';
  tags.add('REVIEW_REQUIRED');
} else {
  route = 'valid';
  orderStatus = 'RECEIVED';
}
if (route !== 'incomplete') {
  tags.add(bonusEligible ? 'HIGH_VALUE_ORDER' : 'STANDARD_ORDER');
  tags.add(customerType);
}
tags.add('PAYMENT_PENDING');  // an order submission is NEVER a payment

// ── 8. Unique order reference: VE-YYYYMMDD-XXXXX (Lagos date) ──
const lagosDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }).replace(/-/g, '');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
let suffix = '';
for (let i = 0; i < 5; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
const orderRef = `VE-${lagosDate}-${suffix}`;

// Tag order: classification first, then status, then extras
const order = ['INCOMPLETE_ORDER', 'HIGH_VALUE_ORDER', 'STANDARD_ORDER', 'REVIEW_REQUIRED', 'PAYMENT_PENDING'];
const sortedTags = [...tags].sort((a, b) => {
  const ia = order.indexOf(a), ib = order.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
});

return [{
  json: {
    route,                                  // valid | review | incomplete
    order_ref: orderRef,
    customer_name: input.name || null,
    customer_email: input.email || null,
    customer_phone: phone ?? (input.phone || null),
    items: lines,
    items_summary: lines.map((l) => `${l.product_name} × ${l.quantity}`).join(', ') || null,
    total_quantity: totalQuantity,
    total_amount: totalAmount,
    bonus_eligible: bonusEligible,
    bonus_amount: bonusAmount,
    bonus_status: bonusEligible ? 'PENDING_PAYMENT' : 'NOT_ELIGIBLE',
    payment_status: 'PAYMENT_PENDING',
    order_status: orderStatus,
    customer_type: route === 'incomplete' ? null : customerType,
    tags: sortedTags,
    errors,
    warnings,
    items_signature: input.signature,
    received_at: input.received_at,
    raw_payload: input.raw,
  },
}];
