-- Run once in Supabase: Dashboard → SQL Editor → paste → Run.
-- The browser never reads these tables directly: all access goes through the
-- API with the service key. Row-level security is ON with no policies, so the
-- public (anon) key can't read or write anything here.

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  slug text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  published boolean not null default false,
  spec jsonb,
  photos jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  chat jsonb not null default '[]'::jsonb,
  free_turns integer not null default 0,
  usage_month text,
  month_turns integer not null default 0,
  subscription_id text,
  subscription_status text,
  subscription_checked_at timestamptz,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sites enable row level security;

-- Photos: public read (they appear on published sites), no public writes.
-- Uploads go through /api/photos with the service key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', true, 1600000, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
