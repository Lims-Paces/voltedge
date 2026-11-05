// ─────────────────────────────────────────────────────────────
// NODE: "Compose Messages"   (Code node · Run Once for All Items)
// Builds the customer email, the Telegram alert, the website
// response and the database record — all from the computed order.
// Wording never claims payment or bonus activation (both pending).
// ─────────────────────────────────────────────────────────────
const SITE_URL = 'https://YOUR-STORE.vercel.app';   // ← change to your deployed site URL

const o = $input.first().json;
const naira = (n) => '₦' + Number(n).toLocaleString('en-NG');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const firstName = (o.customer_name || 'there').split(' ')[0];
const placedAt = new Date(o.received_at).toLocaleString('en-NG', {
  timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short',
});
const payUrl = `${SITE_URL}/pay/${o.order_ref}`;

// ── Human-readable statuses for the customer ──
const statusText = {
  RECEIVED: 'Received, awaiting payment',
  UNDER_REVIEW: 'Received, being checked by our team',
  INCOMPLETE: 'Incomplete',
}[o.order_status];
const paymentText = 'Not yet paid. We have not received a payment for this order.';

// ── Bonus paragraph ──
const bonusHtml = o.bonus_eligible
  ? `<p style="background:#ecfdf3;border:1px solid #abefc6;border-radius:8px;padding:12px 14px;margin:16px 0;">
       <strong>Promotional bonus: ${naira(o.bonus_amount)} store credit (pending)</strong><br>
       Your order is ${naira(o.total_amount)}, so it qualifies for our 5% store-credit bonus on orders of ₦500,000 or more.
       The bonus is <strong>pending</strong> and will only be activated after your payment has been verified.
     </p>`
  : `<p style="color:#555;margin:16px 0;">
       Promotional bonus: not eligible for this order. Orders of ₦500,000 or more earn a 5% store-credit bonus.
     </p>`;

// ── Next steps differ by route ──
const nextStepsHtml = o.route === 'valid'
  ? `<p><strong>Next step:</strong> complete your payment securely with Paystack.</p>
     <p><a href="${payUrl}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Pay ${naira(o.total_amount)} now</a></p>
     <p style="color:#555;font-size:14px;">We will email you again as soon as your payment is verified.</p>`
  : `<p><strong>Next step:</strong> please <strong>do not make a payment yet</strong>. Our team needs to check one or more items in your order before it can proceed.
     We will contact you by email or on ${esc(o.customer_phone)} once the check is complete.</p>`;

const rowsHtml = o.items.map((l) => `
  <tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">${esc(l.product_name)}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${l.quantity}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${naira(l.unit_price)}</td>
    <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${naira(l.line_total)}</td>
  </tr>`).join('');

const emailHtml = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#111;line-height:1.5;">
  <h2 style="margin-bottom:4px;">VoltEdge Electronics</h2>
  <p style="color:#555;margin-top:0;">Order confirmation</p>
  <p>Hi ${esc(firstName)},</p>
  <p>Thank you for your order. Here are the details we received on ${placedAt}.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
    <tr><td style="padding:4px 0;color:#555;">Order reference</td><td style="padding:4px 0;"><strong>${o.order_ref}</strong></td></tr>
    <tr><td style="padding:4px 0;color:#555;">Order status</td><td style="padding:4px 0;">${statusText}</td></tr>
    <tr><td style="padding:4px 0;color:#555;">Payment status</td><td style="padding:4px 0;">${paymentText}</td></tr>
  </table>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr style="background:#f5f5f5;">
      <th style="padding:8px;text-align:left;">Product</th><th style="padding:8px;">Qty</th>
      <th style="padding:8px;text-align:right;">Unit price</th><th style="padding:8px;text-align:right;">Subtotal</th>
    </tr>
    ${rowsHtml}
    <tr><td colspan="3" style="padding:8px;text-align:right;"><strong>Order total</strong></td>
        <td style="padding:8px;text-align:right;"><strong>${naira(o.total_amount)}</strong></td></tr>
  </table>
  ${bonusHtml}
  ${nextStepsHtml}
  <p>If anything above is wrong, simply reply to this email and quote <strong>${o.order_ref}</strong>.</p>
  <p>Thank you for shopping with VoltEdge Electronics.</p>
</div>`;

const emailSubject = o.route === 'valid'
  ? `Order ${o.order_ref} received: ${naira(o.total_amount)} awaiting payment`
  : `Order ${o.order_ref} received: our team is checking it`;

// ── Telegram alert for the team (HTML parse mode) ──
const header = {
  valid: '🛒 <b>New order</b>',
  review: '⚠️ <b>New order: REVIEW REQUIRED</b>',
  incomplete: '❌ <b>Incomplete order submission</b>',
}[o.route];

const tg = [
  `${header}  <code>${o.order_ref}</code>`,
  '',
  `<b>Customer:</b> ${esc(o.customer_name || '(missing)')}`,
  `<b>Email:</b> ${esc(o.customer_email || '(missing)')}`,
  `<b>Phone:</b> ${esc(o.customer_phone || '(missing)')}`,
  `<b>Items:</b> ${esc(o.items_summary || '(none valid)')}`,
  `<b>Total quantity:</b> ${o.total_quantity}`,
  `<b>Total value:</b> ${naira(o.total_amount)}`,
  `<b>Bonus:</b> ${o.bonus_eligible ? `${naira(o.bonus_amount)} (pending payment)` : 'Not eligible'}`,
  `<b>Payment:</b> ${o.payment_status}`,
  `<b>Order status:</b> ${o.order_status}`,
  o.customer_type ? `<b>Customer type:</b> ${o.customer_type}` : null,
  `<b>Tags:</b> ${o.tags.join(', ')}`,
];
if (o.errors.length) tg.push('', '<b>Missing / invalid:</b>', ...o.errors.map((e) => `• ${esc(e)}`));
if (o.warnings.length) tg.push('', '<b>Needs review:</b>', ...o.warnings.map((w) => `• ${esc(w)}`));
if (o.route === 'valid') tg.push('', 'No action needed until payment is confirmed.');

// ── Response the website shows the customer ──
const response = o.route === 'incomplete'
  ? { ok: false, orderRef: o.order_ref, errors: o.errors,
      message: 'We could not process your order. Please correct the details below and try again.' }
  : { ok: true, orderRef: o.order_ref, status: o.order_status, paymentStatus: o.payment_status,
      total: o.total_amount, bonus: o.bonus_amount, canPay: o.route === 'valid',
      message: o.route === 'valid'
        ? 'Order received. Check your email for confirmation and payment instructions.'
        : 'Order received. Our team will check it before payment. Please do not pay yet.' };

// ── Record for the database (create_order function) ──
const dbRecord = {
  order_ref: o.order_ref,
  customer_name: o.customer_name,
  customer_email: o.customer_email,
  customer_phone: o.customer_phone,
  items_summary: o.items_summary,
  total_quantity: o.total_quantity,
  total_amount: o.total_amount,
  bonus_amount: o.bonus_amount,
  bonus_status: o.bonus_status,
  payment_status: o.payment_status,
  order_status: o.order_status,
  tags: o.tags,
  warnings: [...o.errors, ...o.warnings],
  customer_type: o.customer_type,
  items_signature: o.items_signature,
  items: o.items,
  raw_payload: o.raw_payload,
};

return [{
  json: {
    ...o,
    email_subject: emailSubject,
    email_html: emailHtml,
    telegram_text: tg.filter((line) => line !== null).join('\n'),
    response,
    db_record: dbRecord,
  },
}];
