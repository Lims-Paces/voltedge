-- =====================================================================
-- VoltEdge Electronics — database schema (Supabase / Postgres)
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Safe to re-run: it drops and recreates the VoltEdge objects.
-- =====================================================================

drop function if exists create_order(jsonb);
drop function if exists confirm_payment(text, text, bigint);
drop table if exists order_items;
drop table if exists orders;
drop table if exists products;

-- ---------------------------------------------------------------------
-- 1. PRODUCTS — the single source of truth for prices and stock.
--    The website DISPLAYS these prices; n8n CHARGES these prices.
-- ---------------------------------------------------------------------
create table products (
  id          text primary key,              -- e.g. 'macbook-air-m4'
  name        text not null,
  price       bigint not null check (price > 0),   -- in Naira (₦), whole numbers
  stock       integer not null default 0 check (stock >= 0),
  category    text,
  image_url   text,
  active      boolean not null default true
);

insert into products (id, name, price, stock, category) values
  ('macbook-air-m4',     'MacBook Air M4',             1850000,  5, 'Laptops'),
  ('galaxy-s25-ultra',   'Samsung Galaxy S25 Ultra',   1650000,  8, 'Phones'),
  ('ps5-slim',           'PlayStation 5 Slim',          950000,  4, 'Gaming'),
  ('ipad-air',           'iPad Air',                   1100000,  6, 'Tablets'),
  ('sony-wh-1000xm5',    'Sony WH-1000XM5 Headphones',  650000, 10, 'Audio'),
  ('samsung-55-4k-tv',   'Samsung 55-inch 4K TV',      1400000,  3, 'TVs'),
  ('logitech-mouse',     'Logitech Wireless Mouse',     180000, 25, 'Accessories'),
  ('anker-power-bank',   'Anker Power Bank',             95000, 30, 'Accessories');

-- ---------------------------------------------------------------------
-- 2. ORDERS — one row per submitted order (valid, under review or incomplete)
-- ---------------------------------------------------------------------
create table orders (
  id                bigint generated always as identity primary key,
  order_ref         text not null unique,      -- e.g. VE-20261106-K7Q2M
  customer_name     text,
  customer_email    text,
  customer_phone    text,
  items_summary     text,                      -- "Sony WH-1000XM5 Headphones × 1"
  total_quantity    integer not null default 0,
  total_amount      bigint  not null default 0,   -- ₦
  bonus_amount      bigint  not null default 0,   -- ₦ (5% if total ≥ ₦500,000)
  bonus_status      text not null default 'NOT_ELIGIBLE'
                    check (bonus_status in ('NOT_ELIGIBLE','PENDING_PAYMENT','ACTIVE')),
  payment_status    text not null default 'PAYMENT_PENDING'
                    check (payment_status in ('PAYMENT_PENDING','PAYMENT_CONFIRMED')),
  order_status      text not null
                    check (order_status in ('RECEIVED','UNDER_REVIEW','INCOMPLETE','CONFIRMED')),
  tags              text[] not null default '{}',
  warnings          text[] not null default '{}',
  customer_type     text,                      -- NEW_CUSTOMER / RETURNING_CUSTOMER / VIP_CUSTOMER
  items_signature   text,                      -- used for duplicate detection
  payment_reference text,                      -- Paystack reference, once paid
  amount_paid       bigint,                    -- ₦ actually verified by Paystack
  paid_at           timestamptz,
  raw_payload       jsonb,                     -- exactly what the website sent (audit trail)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index orders_email_idx   on orders (lower(customer_email));
create index orders_created_idx on orders (created_at desc);

-- ---------------------------------------------------------------------
-- 3. ORDER ITEMS — one row per product line in an order
-- ---------------------------------------------------------------------
create table order_items (
  id            bigint generated always as identity primary key,
  order_ref     text not null references orders(order_ref) on delete cascade,
  product_id    text references products(id),
  product_name  text not null,
  quantity      integer not null check (quantity > 0),
  unit_price    bigint  not null,
  line_total    bigint  not null
);

-- ---------------------------------------------------------------------
-- 4. create_order(order jsonb)
--    Called by n8n. Saves the order AND its items in one transaction,
--    so you never get an order without items (or the reverse).
-- ---------------------------------------------------------------------
create or replace function create_order(p jsonb)
returns table (saved_ref text, saved_status text, saved_at timestamptz)
language plpgsql
as $$
begin
  insert into orders (
    order_ref, customer_name, customer_email, customer_phone,
    items_summary, total_quantity, total_amount, bonus_amount, bonus_status,
    payment_status, order_status, tags, warnings, customer_type,
    items_signature, raw_payload
  ) values (
    p->>'order_ref',
    p->>'customer_name',
    p->>'customer_email',
    p->>'customer_phone',
    p->>'items_summary',
    coalesce((p->>'total_quantity')::int, 0),
    coalesce((p->>'total_amount')::bigint, 0),
    coalesce((p->>'bonus_amount')::bigint, 0),
    coalesce(p->>'bonus_status', 'NOT_ELIGIBLE'),
    coalesce(p->>'payment_status', 'PAYMENT_PENDING'),
    p->>'order_status',
    coalesce(array(select jsonb_array_elements_text(p->'tags')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p->'warnings')), '{}'),
    p->>'customer_type',
    p->>'items_signature',
    p->'raw_payload'
  );

  insert into order_items (order_ref, product_id, product_name, quantity, unit_price, line_total)
  select p->>'order_ref',
         i->>'product_id',
         i->>'product_name',
         (i->>'quantity')::int,
         (i->>'unit_price')::bigint,
         (i->>'line_total')::bigint
  from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) as i;

  return query
    select o.order_ref, o.order_status, o.created_at
    from orders o where o.order_ref = p->>'order_ref';
end;
$$;

-- ---------------------------------------------------------------------
-- 5. confirm_payment(order_ref, paystack_reference, amount_in_kobo)
--    Called by n8n ONLY after Paystack's verify API says "success".
--    - Idempotent: Paystack may send the same webhook more than once.
--    - Checks the amount paid matches the order total.
--    - Activates the bonus and reduces stock.
-- ---------------------------------------------------------------------
create or replace function confirm_payment(p_ref text, p_paystack_ref text, p_amount_kobo bigint)
returns jsonb
language plpgsql
as $$
declare
  o orders%rowtype;
  paid_naira bigint := p_amount_kobo / 100;
begin
  select * into o from orders where order_ref = p_ref for update;

  if not found then
    return jsonb_build_object('result', 'NOT_FOUND', 'order_ref', p_ref);
  end if;

  if o.payment_status = 'PAYMENT_CONFIRMED' then
    return jsonb_build_object('result', 'ALREADY_CONFIRMED', 'order_ref', p_ref);
  end if;

  if paid_naira <> o.total_amount then
    update orders set
      order_status = 'UNDER_REVIEW',
      tags     = array(select distinct unnest(tags || array['REVIEW_REQUIRED','PAYMENT_AMOUNT_MISMATCH'])),
      warnings = warnings || format('Paystack amount ₦%s does not match order total ₦%s', paid_naira, o.total_amount),
      payment_reference = p_paystack_ref,
      updated_at = now()
    where order_ref = p_ref;
    return jsonb_build_object('result', 'AMOUNT_MISMATCH', 'order_ref', p_ref,
                              'paid', paid_naira, 'expected', o.total_amount);
  end if;

  update orders set
    payment_status    = 'PAYMENT_CONFIRMED',
    order_status      = 'CONFIRMED',
    bonus_status      = case when bonus_amount > 0 then 'ACTIVE' else 'NOT_ELIGIBLE' end,
    tags              = array_append(array_remove(tags, 'PAYMENT_PENDING'), 'PAYMENT_CONFIRMED'),
    payment_reference = p_paystack_ref,
    amount_paid       = paid_naira,
    paid_at           = now(),
    updated_at        = now()
  where order_ref = p_ref;

  -- Stock only goes down once money is actually received
  update products pr
     set stock = greatest(pr.stock - oi.quantity, 0)
    from order_items oi
   where oi.order_ref = p_ref and oi.product_id = pr.id;

  return (
    select jsonb_build_object(
      'result', 'CONFIRMED',
      'order_ref', o2.order_ref,
      'customer_name', o2.customer_name,
      'customer_email', o2.customer_email,
      'items_summary', o2.items_summary,
      'total_amount', o2.total_amount,
      'bonus_amount', o2.bonus_amount,
      'bonus_status', o2.bonus_status,
      'payment_reference', o2.payment_reference,
      'tags', o2.tags
    )
    from orders o2 where o2.order_ref = p_ref
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 6. SECURITY (Row Level Security)
--    - The website (anon key) may READ active products. Nothing else.
--    - Orders are invisible to the public.
--    - n8n connects as the database owner (postgres), which bypasses RLS.
--    - The website's /api/pay route uses the service_role key (server only).
-- ---------------------------------------------------------------------
alter table products    enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;

create policy "Public can read active products"
  on products for select
  to anon, authenticated
  using (active = true);

-- Functions must not be callable by the public through the API
revoke execute on function create_order(jsonb) from public, anon, authenticated;
revoke execute on function confirm_payment(text, text, bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Handy queries for your screenshots / Loom:
--   select order_ref, customer_name, items_summary, total_amount, bonus_amount,
--          bonus_status, payment_status, order_status, tags, created_at
--   from orders order by created_at desc;
--
--   select * from order_items order by id desc;
-- ---------------------------------------------------------------------
