import SimpleHeader from "@/app/components/SimpleHeader";
import { supabaseAdmin, naira, type OrderRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Paystack sends the customer here after paying. This page does NOT decide
// whether payment succeeded: only n8n's verified webhook does. We just show
// what the database currently says.
export default async function PaymentCallback({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference = "" } = await searchParams;
  const orderRef = reference.split("_")[0];

  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select("order_ref, total_amount, bonus_amount, payment_status")
    .eq("order_ref", orderRef)
    .maybeSingle<OrderRow>();

  const confirmed = order?.payment_status === "PAYMENT_CONFIRMED";

  return (
    <><SimpleHeader /><main className="page"><section className="panel success">
      <h2>{confirmed ? "Payment verified ✅" : "Verifying your payment…"}</h2>
      {order && <p>Order <strong>{order.order_ref}</strong> · {naira(order.total_amount)}</p>}
      {confirmed ? (
        <p>
          Thank you! Your payment has been verified.
          {order!.bonus_amount > 0 && <> Your {naira(order!.bonus_amount)} store-credit bonus is now active.</>} A
          confirmation email is on its way.
        </p>
      ) : (
        <p>
          We are confirming your payment with Paystack. You will receive an email as soon as it is verified. You can{" "}
          <a href={`/payment/callback?reference=${encodeURIComponent(reference)}`}>refresh this page</a> to check.
        </p>
      )}
      <a className="btn ghost" href="/">Back to store</a>
    </section></main></>
  );
}
