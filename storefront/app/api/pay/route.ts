import { NextResponse } from "next/server";
import { supabaseAdmin, type OrderRow } from "@/lib/supabase";

// Starts a Paystack payment. The amount and email come from the DATABASE, never the browser.
export async function POST(req: Request) {
  const form = await req.formData();
  const ref = String(form.get("ref") ?? "");
  const site = process.env.NEXT_PUBLIC_SITE_URL!;

  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select("order_ref, customer_email, total_amount, order_status, payment_status")
    .eq("order_ref", ref)
    .maybeSingle<OrderRow>();

  if (!order) return NextResponse.redirect(`${site}/pay/${encodeURIComponent(ref)}?error=not_found`, 303);
  if (order.payment_status === "PAYMENT_CONFIRMED")
    return NextResponse.redirect(`${site}/pay/${ref}?error=already_paid`, 303);
  if (order.order_status !== "RECEIVED")
    return NextResponse.redirect(`${site}/pay/${ref}?error=not_payable`, 303);

  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: order.customer_email,
        amount: Number(order.total_amount) * 100, // Paystack uses kobo
        currency: "NGN",
        reference: `${order.order_ref}_${Date.now()}`,
        callback_url: `${site}/payment/callback`,
        metadata: { order_ref: order.order_ref },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json();
    if (!json.status) throw new Error(json.message);
    return NextResponse.redirect(json.data.authorization_url, 303);
  } catch (err) {
    console.error("Paystack initialize failed:", err);
    return NextResponse.redirect(`${site}/pay/${ref}?error=paystack`, 303);
  }
}