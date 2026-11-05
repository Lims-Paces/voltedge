// ─────────────────────────────────────────────────────────────
// NODE: "Check Verification"   (Code node · Run Once for All Items)
// Workflow 02. Reads Paystack's VERIFY API answer (not the webhook body)
// and decides, deterministically, whether this payment is real.
// ─────────────────────────────────────────────────────────────
const webhook = $('Paystack Webhook').first().json.body ?? {};
const reference = webhook.data?.reference ?? '';
const v = $input.first().json;            // response from GET /transaction/verify/:reference
const tx = v.data ?? {};

let reason = null;
if (v.error) reason = 'Could not reach Paystack verify API';
else if (v.status !== true) reason = v.message || 'Paystack did not confirm the transaction';
else if (tx.status !== 'success') reason = `Transaction status is "${tx.status}"`;
else if (tx.currency !== 'NGN') reason = `Unexpected currency ${tx.currency}`;
else if (tx.reference !== reference) reason = 'Reference mismatch between webhook and verify API';

// The order reference was sent in metadata; the Paystack reference is "<order_ref>_<timestamp>"
const orderRef = tx.metadata?.order_ref || String(tx.reference ?? reference).split('_')[0];

return [{
  json: {
    verified: reason === null,
    reason,
    reference,
    order_ref: orderRef,
    amount_kobo: Number(tx.amount ?? 0),
    paid_at: tx.paid_at ?? null,
    channel: tx.channel ?? null,
  },
}];
