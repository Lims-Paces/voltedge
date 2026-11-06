import SimpleHeader from "@/app/components/SimpleHeader";
import { supabaseAdmin, naira, type OrderRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  not_found: "We couldn't find that order.",
  already_paid: "This order has already been paid. Thank you!",
  not_payable: "This order is being checked by our team. Please wait for our email before paying.",
  paystack: "We couldn't start the payment. Please try again in a moment.",
};

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { ref } = await params;
  const { error } = await searchParams;

  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select("order_ref, customer_name, items_summary, total_amount, bonus_amount, bonus_status, payment_status, order_status")
    .eq("order_ref", ref)
    .maybeSingle<OrderRow>();

  if (!order) return <><SimpleHeader /><main className="page"><section className="panel success"><h2>Order not found</h2><p>Check the reference in your email.</p></section></main></>;

  const paid = order.payment_status === "PAYMENT_CONFIRMED";
  const payable = !paid && order.order_status === "RECEIVED";

  return (
    <><SimpleHeader /><main className="page"><section className="panel success">
      <h2>Order {order.order_ref}</h2>
      {error && <p className="notice error">{ERRORS[error] ?? "Something went wrong."}</p>}
      <ul className="facts">
        <li>Items: <strong>{order.items_summary}</strong></li>
        <li>Total: <strong>{naira(order.total_amount)}</strong></li>
        <li>Payment status: <strong>{paid ? "Paid and verified" : "Awaiting payment"}</strong></li>
        {order.bonus_amount > 0 && (
          <li>
            Bonus: <strong>{naira(order.bonus_amount)} store credit, {order.bonus_status === "ACTIVE" ? "active" : "pending until payment is verified"}</strong>
          </li>
        )}
      </ul>
      {payable && (
        <form action="/api/pay" method="POST">
          <input type="hidden" name="ref" value={order.order_ref} />
          <button className="btn" type="submit">Pay {naira(order.total_amount)} with Paystack</button>
        </form>
      )}
      {!payable && !paid && <p className="notice">{ERRORS.not_payable}</p>}
    </section></main></>
  );
}
