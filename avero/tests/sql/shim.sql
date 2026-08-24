-- =====================================================================
-- Minimal etterligning av Supabase-plattformen, kun for lokale tester.
-- Gir oss auth.users, auth.uid() og databaserollene anon/authenticated,
-- slik at de ekte migrasjonene og RLS-policyene kan kjores uendret.
-- Denne filen brukes ALDRI i produksjon.
-- =====================================================================
create schema if not exists auth;

create table if not exists auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,
  created_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  -- En tom streng er ikke gyldig JSON. Etter at en transaksjon er rullet
  -- tilbake star GUC-en igjen som tom streng, sa den ma nulles ut forst.
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', ''
  )::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end;
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;
