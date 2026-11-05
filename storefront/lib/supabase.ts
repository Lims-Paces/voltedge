import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Public client: can only READ active products (enforced by Row Level Security).
export const supabasePublic = () =>
  createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

// Admin client: SERVER ONLY (API routes / server components). Never import in a client component.
export const supabaseAdmin = () =>
  createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

export type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string | null;
  image_url: string | null;
};

export type OrderRow = {
  order_ref: string;
  customer_name: string | null;
  customer_email: string | null;
  items_summary: string | null;
  total_amount: number;
  bonus_amount: number;
  bonus_status: string;
  payment_status: string;
  order_status: string;
};

export const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG");
