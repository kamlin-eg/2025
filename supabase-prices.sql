-- Run once in the SQL Editor for project hxphmxkimjxngsrlxcjn.
-- Prices only. Customer and staff data must never be stored in this public row.
begin;
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint site_settings_object check (jsonb_typeof(value) = 'object')
);
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
