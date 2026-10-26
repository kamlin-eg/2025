-- Run once in the SQL Editor for project hxphmxkimjxngsrlxcjn.
-- Prices only. Customer and staff data must never be stored in this public row.
begin;
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_settings_object check (jsonb_typeof(value) = 'object')
);

-- Enforce the complete public payload in PostgreSQL, including direct API writes.
create or replace function public.kamlin_valid_prices(payload jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare
  required_keys constant text[] := ARRAY['priceRegular', 'priceDeep', 'priceConstruction', 'priceVillas', 'priceCompanies', 'priceClinics', 'priceSofa', 'priceMattress', 'priceDisinfectSmall', 'priceDisinfectMedium', 'priceDisinfectLarge', 'priceAnts', 'priceCockroaches', 'priceFlying', 'priceRodents', 'priceBedbugs', 'priceEconomic', 'priceComplete', 'priceShine', 'priceRoyal', 'priceMonthly4', 'priceMonthly8', 'priceMonthly12'];
  field text;
  amount numeric;
begin
  if jsonb_typeof(payload) is distinct from 'object' then return false; end if;
  if (select count(*) from jsonb_object_keys(payload)) <> array_length(required_keys, 1)
     or not (payload ?& required_keys) then return false; end if;
  foreach field in array required_keys loop
    if jsonb_typeof(payload -> field) is distinct from 'number' then return false; end if;
    amount := (payload ->> field)::numeric;
    if amount < 0 or amount <> round(amount, 2) then return false; end if;
  end loop;
  return true;
end $$;

-- Re-applying must inspect existing data instead of silently accepting a wrong schema.
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.site_settings'::regclass and contype = 'p' and pg_get_constraintdef(oid) = 'PRIMARY KEY (key)') then
    raise exception 'site_settings needs a primary key on key; review the existing schema';
  end if;
end $$;
alter table public.site_settings drop constraint if exists kamlin_prices_payload;
alter table public.site_settings add constraint kamlin_prices_payload
  check (key <> 'prices' or public.kamlin_valid_prices(value));

create or replace function public.kamlin_settings_timestamp()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists kamlin_settings_timestamp on public.site_settings;
create trigger kamlin_settings_timestamp before insert or update on public.site_settings
for each row execute function public.kamlin_settings_timestamp();

alter table public.site_settings enable row level security;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
revoke insert, update, delete on public.site_settings from anon;
revoke delete on public.site_settings from authenticated;

-- Fail rather than accidentally grant another user permission to publish prices.
do $$
declare admin_id uuid;
begin
  select id into strict admin_id from auth.users
  where lower(email) = 'kamlin.eg2025@gmail.com';
  if exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'site_settings'
    and policyname not in ('kamlin_public_prices', 'kamlin_admin_insert_prices', 'kamlin_admin_update_prices')
  ) then
    raise exception 'Existing site_settings policies need review before applying this migration';
  end if;
  drop policy if exists kamlin_public_prices on public.site_settings;
  drop policy if exists kamlin_admin_insert_prices on public.site_settings;
  drop policy if exists kamlin_admin_update_prices on public.site_settings;
  create policy kamlin_public_prices on public.site_settings for select to anon, authenticated using (key = 'prices');
  execute format('create policy kamlin_admin_insert_prices on public.site_settings for insert to authenticated with check (key = %L and (select auth.uid()) = %L::uuid)', 'prices', admin_id);
  execute format('create policy kamlin_admin_update_prices on public.site_settings for update to authenticated using (key = %L and (select auth.uid()) = %L::uuid) with check (key = %L and (select auth.uid()) = %L::uuid)', 'prices', admin_id, 'prices', admin_id);
end $$;
-- Do not publish placeholder prices. The admin reviews and saves them first.
commit;
