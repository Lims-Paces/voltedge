// ─────────────────────────────────────────────────────────────
// NODE: "Compose Payment Messages"   (Code node · Run Once for All Items)
// Workflow 02. Runs after confirm_payment() in the database.
// Only a CONFIRMED result produces a "payment received" email.
// ─────────────────────────────────────────────────────────────
const raw = $input.first().json.result;
const r = typeof raw === 'string' ? JSON.parse(raw) : raw;   // the DB returns jsonb
const v = $('Check Verification').first().json;
const naira = (n) => '₦' + Number(n).toLocaleString('en-NG');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

if (r.result === 'ALREADY_CONFIRMED') {
  return [];   // Paystack re-sent the webhook; nothing to do (stops quietly)
}

if (r.result !== 'CONFIRMED') {
  const why = r.result === 'AMOUNT_MISMATCH'
    ? `Paid ${naira(r.paid)} but the order total is ${naira(r.expected)}. Order moved to UNDER_REVIEW.`
    : `No order found for reference ${esc(r.order_ref)}.`;
  return [{
    json: {
      result: 'PROBLEM',
      telegram_text: `⚠️ <b>Payment needs attention</b>  <code>${esc(r.order_ref)}</code>\n${why}\nPaystack ref: <code>${esc(v.reference)}</code>`,
    },
  }];
}

const firstName = (r.customer_name || 'there').split(' ')[0];
const bonusHtml = Number(r.bonus_amount) > 0
  ? `<p style="background:#ecfdf3;border:1px solid #abefc6;border-radius:8px;padding:12px 14px;">
       <strong>Your ${naira(r.bonus_amount)} promotional store credit is now active.</strong>
     </p>`
  : '';

const emailHtml = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#111;line-height:1.5;">
  <h2 style="margin-bottom:4px;">VoltEdge Electronics</h2>
  <p style="color:#555;margin-top:0;">Payment confirmation</p>
  <p>Hi ${esc(firstName)},</p>
  <p>We have received and verified your payment of <strong>${naira(r.total_amount)}</strong> for order <strong>${r.order_ref}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
    <tr><td style="padding:4px 0;color:#555;">Items</td><td>${esc(r.items_summary)}</td></tr>
    <tr><td style="padding:4px 0;color:#555;">Order status</td><td>Confirmed</td></tr>
    <tr><td style="padding:4px 0;color:#555;">Payment status</td><td>Paid (verified by Paystack)</td></tr>
    <tr><td style="padding:4px 0;color:#555;">Payment reference</td><td>${esc(r.payment_reference)}</td></tr>
  </table>
  ${bonusHtml}
  <p><strong>Next step:</strong> our team will contact you to arrange delivery.</p>
  <p>Thank you for shopping with VoltEdge Electronics.</p>
</div>`;

return [{
  json: {
    result: 'CONFIRMED',
    customer_email: r.customer_email,
    email_subject: `Payment received for order ${r.order_ref}`,
    email_html: emailHtml,
    telegram_text: [
      `✅ <b>Payment confirmed</b>  <code>${r.order_ref}</code>`,
      '',
      `<b>Customer:</b> ${esc(r.customer_name)} (${esc(r.customer_email)})`,
      `<b>Items:</b> ${esc(r.items_summary)}`,
      `<b>Amount verified:</b> ${naira(r.total_amount)}`,
      `<b>Bonus:</b> ${Number(r.bonus_amount) > 0 ? `${naira(r.bonus_amount)} now ACTIVE` : 'Not eligible'}`,
      `<b>Tags:</b> ${r.tags.join(', ')}`,
      '',
      'Ready for fulfilment.',
    ].join('\n'),
  },
}];
