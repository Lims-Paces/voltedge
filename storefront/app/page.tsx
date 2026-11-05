import Storefront from "./components/Storefront";
import { supabasePublic, type Product } from "@/lib/supabase";

// Always read live prices and stock from the database
export const dynamic = "force-dynamic";

export default async function Home() {
  const { data, error } = await supabasePublic()
    .from("products")
    .select("id, name, price, stock, category, image_url")
    .order("price", { ascending: false });

  if (error) {
    return <p className="notice error">Could not load products: {error.message}</p>;
  }

  return (
    <>
      <section className="hero">
        <h1>Premium electronics, honest prices.</h1>
        <p>
          Orders of <strong>₦500,000 or more</strong> earn a <strong>5% store-credit bonus</strong>, activated once
          your payment is verified.
        </p>
      </section>
      <Storefront products={(data ?? []) as Product[]} />
    </>
  );
}
