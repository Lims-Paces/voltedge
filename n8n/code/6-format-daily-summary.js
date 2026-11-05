// ─────────────────────────────────────────────────────────────
// NODE: "Format Report"   (Code node · Run Once for All Items)
// Workflow 03. Turns today's numbers into a Telegram message.
// ─────────────────────────────────────────────────────────────
const s = $input.first().json;
const naira = (n) => '₦' + Number(n).toLocaleString('en-NG');
const today = new Date().toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'full' });

const text = [
  `📊 <b>VoltEdge daily summary</b>`,
  today,
  '',
  `<b>Orders received:</b> ${s.total_orders}`,
  `<b>Total order value:</b> ${naira(s.total_value)}`,
  `<b>High-value orders:</b> ${s.high_value_orders}`,
  `<b>Awaiting payment:</b> ${s.awaiting_payment}`,
  `<b>Paid today:</b> ${s.paid_orders} (${naira(s.total_paid)})`,
  `<b>Bonuses pending verification:</b> ${s.bonuses_pending} (${naira(s.bonus_value_pending)})`,
  `<b>Under review:</b> ${s.under_review}`,
  `<b>Incomplete submissions:</b> ${s.incomplete}`,
].join('\n');

return [{ json: { ...s, telegram_text: text } }];
