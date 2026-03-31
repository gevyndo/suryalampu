-- ============================================================
-- Suryalampu — Supabase Setup SQL
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Create products table
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  image_url   text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table products enable row level security;

-- 3. Policies — allow all via anon key (simple internal admin)
drop policy if exists "allow_all" on products;
create policy "allow_all" on products
  for all
  using (true)
  with check (true);

-- ============================================================
-- Storage bucket policies (run in SQL Editor)
-- Make sure bucket "surya" is set to PUBLIC in Storage settings
-- ============================================================

-- Allow public to read images
insert into storage.buckets (id, name, public)
  values ('surya', 'surya', true)
  on conflict (id) do update set public = true;

-- Allow anon to upload images
drop policy if exists "anon_upload" on storage.objects;
create policy "anon_upload" on storage.objects
  for insert with check (bucket_id = 'surya');

-- Allow anon to delete images
drop policy if exists "anon_delete" on storage.objects;
create policy "anon_delete" on storage.objects
  for delete using (bucket_id = 'surya');

-- Allow public to read storage objects
drop policy if exists "public_read" on storage.objects;
create policy "public_read" on storage.objects
  for select using (bucket_id = 'surya');
