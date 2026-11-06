import Storefront from "./components/Storefront";
import { supabasePublic, type Product } from "@/lib/supabase";

// Always read live prices and stock from the database
export const dynamic = "force-dynamic";

export default async function Home() {
  const { data, error } = await supabasePublic()
    .from("products")
    .select("id, name, price, stock, category, image_url")
    .eq("active", true)
    .order("price", { ascending: false });

  if (error) {
    return <p className="notice error page-error">The catalogue couldn't load: {error.message}</p>;
  }

  return <Storefront products={(data ?? []) as Product[]} />;
}
