-- ANGKON: House of Modern Heritage
-- Database Schema for E-commerce Storefront (rebuilt from Gorur Ghash recon)

-- 1. Categories Table
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  parent_id uuid references categories(id) on delete set null,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_categories_slug on categories(slug);
create index idx_categories_parent on categories(parent_id);

-- 2. Products Table
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  short_description text,
  sku text unique,
  regular_price integer not null check (regular_price >= 0), -- stored in BDT
  sale_price integer check (sale_price is null or (sale_price >= 0 and sale_price < regular_price)),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  stock_status text not null default 'instock' check (stock_status in ('instock', 'outofstock', 'onbackorder')),
  category_id uuid not null references categories(id) on delete restrict,
  images jsonb not null default '[]'::jsonb, -- array of {src, alt}
  is_featured boolean not null default false,
  rating_count integer not null default 0,
  average_rating numeric(3, 2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_slug on products(slug);
create index idx_products_category on products(category_id);
create index idx_products_stock on products(stock_status);
create index idx_products_price on products(regular_price);
create index idx_products_created on products(created_at desc);

-- 3. Product Variants (Sizes / Colors)
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size text not null, -- S, M, L, XL, XXL
  color text,
  sku text unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  price_override integer check (price_override is null or price_override >= 0),
  created_at timestamptz not null default now(),
  constraint uq_product_size_color unique (product_id, size, color)
);

create index idx_variants_product on product_variants(product_id);

-- 4. Customers Table
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  email text,
  full_name text not null,
  district text not null,
  address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_phone on customers(phone);

-- 5. Orders Table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  district text not null,
  shipping_address text not null,
  delivery_zone text not null check (delivery_zone in ('inside_dhaka', 'outside_dhaka')),
  shipping_fee integer not null default 60 check (shipping_fee >= 0), -- 60 inside Dhaka, 100 outside Dhaka
  subtotal integer not null check (subtotal >= 0),
  total_amount integer not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null default 'cod' check (payment_method in ('cod', 'bkash', 'nagad', 'card')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  order_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_customer on orders(customer_id);
create index idx_orders_status on orders(status);
create index idx_orders_phone on orders(customer_phone);
create index idx_orders_created on orders(created_at desc);

-- 6. Order Items Table
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,
  size text,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  total_price integer not null check (total_price >= 0),
  created_at timestamptz not null default now()
);

create index idx_order_items_order on order_items(order_id);
create index idx_order_items_product on order_items(product_id);

-- 7. Reviews Table
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  reviewer_name text not null,
  reviewer_phone text,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  is_verified_buyer boolean not null default false,
  is_approved boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_reviews_product on reviews(product_id);
create index idx_reviews_approved on reviews(product_id, is_approved);
