-- =====================================================================
-- Avero Sikkerhet - komplett databaseoppsett
--
-- Lim hele denne filen inn i SQL Editor i Supabase og kjor den.
-- Filen kan kjores flere ganger uten a odelegge data.
--
-- Generert av: npm run sql:samle
-- Kilde: supabase/migrations/
-- =====================================================================


-- ---------------------------------------------------------------------
-- 20260824090000_skjema.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- Avero Sikkerhet AS - grunnskjema
-- Alle tabeller bruker UUID, created_at/updated_at og soft delete der
-- det er relevant. Kolonnenavn er engelske (som tabellnavnene), mens
-- verdier i statusfelt er norske fordi de vises direkte i grensesnittet.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Selskap
-- ---------------------------------------------------------------------
create table if not exists public.companies (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  org_number                  text,
  -- Funksjonsbrytere som administrator styrer
  open_shifts_enabled         boolean not null default true,
  -- Hvor lenge for/etter vakten journalen kan brukes (minutter)
  journal_open_before_minutes integer not null default 60,
  journal_open_after_minutes  integer not null default 720,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  deleted_at                  timestamptz
);

-- ---------------------------------------------------------------------
-- Roller (oppslagstabell)
-- ---------------------------------------------------------------------
create table if not exists public.roles (
  key         text primary key,
  name        text not null,
  description text,
  level       integer not null
);

insert into public.roles (key, name, description, level) values
  ('ansatt',         'Ansatt',         'Ser kun egne vakter, instrukser, journaler og rapporter.', 10),
  ('operativ_leder', 'Operativ leder', 'Ser data innenfor tildelte avdelinger og objekter.',       20),
  ('administrator',  'Administrator',  'Full tilgang innenfor eget selskap.',                      30)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Avdelinger
-- ---------------------------------------------------------------------
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (id, company_id)
);

-- ---------------------------------------------------------------------
-- Profiler (kobles 1:1 mot auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  department_id   uuid,
  employee_number text,
  first_name      text not null,
  last_name       text not null,
  full_name       text generated always as (first_name || ' ' || last_name) stored,
  email           text not null,
  phone           text,
  job_title       text,
  role            text not null default 'ansatt' references public.roles(key),
  is_active       boolean not null default true,
  deactivated_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (id, company_id),
  constraint profiles_department_fk
    foreign key (department_id, company_id)
    references public.departments(id, company_id) on delete set null
);

create index if not exists profiles_company_idx    on public.profiles (company_id);
create index if not exists profiles_department_idx on public.profiles (department_id);

-- ---------------------------------------------------------------------
-- Kunder
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  org_number    text,
  contact_name  text,
  contact_phone text,
  contact_email text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (id, company_id)
);

-- ---------------------------------------------------------------------
-- Objekter (sites)
-- ---------------------------------------------------------------------
create table if not exists public.sites (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  customer_id    uuid not null,
  department_id  uuid,
  name           text not null,
  code           text,
  address        text,
  postal_code    text,
  city           text,
  meeting_point  text,
  map_url        text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  unique (id, company_id),
  constraint sites_customer_fk
    foreign key (customer_id, company_id)
    references public.customers(id, company_id) on delete cascade,
  constraint sites_department_fk
    foreign key (department_id, company_id)
    references public.departments(id, company_id) on delete set null
);

create index if not exists sites_company_idx  on public.sites (company_id);
create index if not exists sites_customer_idx on public.sites (customer_id);

-- Kontaktpersoner pa objekt. Synlighet for ansatte styres av administrator
-- pa radniva, slik at RLS kan handheve det.
create table if not exists public.site_contacts (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  site_id             uuid not null,
  name                text not null,
  role_description    text,
  phone               text,
  email               text,
  visible_to_employee boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  constraint site_contacts_site_fk
    foreign key (site_id, company_id)
    references public.sites(id, company_id) on delete cascade
);

create index if not exists site_contacts_site_idx on public.site_contacts (site_id);

-- ---------------------------------------------------------------------
-- Ansvarsomrade for operativ leder
-- ---------------------------------------------------------------------
create table if not exists public.manager_scopes (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  manager_id    uuid not null,
  department_id uuid,
  site_id       uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint manager_scopes_manager_fk
    foreign key (manager_id, company_id)
    references public.profiles(id, company_id) on delete cascade,
  constraint manager_scopes_department_fk
    foreign key (department_id, company_id)
    references public.departments(id, company_id) on delete cascade,
  constraint manager_scopes_site_fk
    foreign key (site_id, company_id)
    references public.sites(id, company_id) on delete cascade,
  constraint manager_scopes_target_chk
    check (num_nonnulls(department_id, site_id) = 1)
);

create index if not exists manager_scopes_manager_idx on public.manager_scopes (manager_id);

-- ---------------------------------------------------------------------
-- Objekttilgang for ansatte
-- ---------------------------------------------------------------------
create table if not exists public.employee_site_access (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  profile_id  uuid not null,
  site_id     uuid not null,
  valid_from  date not null default current_date,
  valid_to    date,
  granted_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  constraint employee_site_access_profile_fk
    foreign key (profile_id, company_id)
    references public.profiles(id, company_id) on delete cascade,
  constraint employee_site_access_site_fk
    foreign key (site_id, company_id)
    references public.sites(id, company_id) on delete cascade,
  constraint employee_site_access_period_chk
    check (valid_to is null or valid_to >= valid_from)
);

create unique index if not exists employee_site_access_unique
  on public.employee_site_access (profile_id, site_id)
  where deleted_at is null;

-- ---------------------------------------------------------------------
-- Vakter
-- ---------------------------------------------------------------------
create table if not exists public.shifts (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  site_id       uuid not null,
  department_id uuid,
  shift_type    text not null default 'stasjonaer'
    check (shift_type in ('stasjonaer','rundering','arrangement','utrykning','resepsjon','verditransport')),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        text not null default 'planlagt'
    check (status in ('planlagt','ledig','tildelt','pagaende','fullfort','avlyst')),
  meeting_point text,
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (id, company_id),
  constraint shifts_site_fk
    foreign key (site_id, company_id)
    references public.sites(id, company_id) on delete cascade,
  constraint shifts_department_fk
    foreign key (department_id, company_id)
    references public.departments(id, company_id) on delete set null,
  -- Vakter som gar over midnatt er helt vanlige; sluttidspunktet ma bare
  -- ligge etter starttidspunktet.
  constraint shifts_period_chk check (ends_at > starts_at)
);

create index if not exists shifts_company_starts_idx on public.shifts (company_id, starts_at);
create index if not exists shifts_site_idx           on public.shifts (site_id);
create index if not exists shifts_status_idx         on public.shifts (status);

-- ---------------------------------------------------------------------
-- Vakttildelinger
-- ---------------------------------------------------------------------
create table if not exists public.shift_assignments (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  shift_id     uuid not null,
  employee_id  uuid not null,
  status       text not null default 'tildelt'
    check (status in ('tildelt','godkjent','soknad','avslatt','trukket')),
  assigned_by  uuid references public.profiles(id) on delete set null,
  assigned_at  timestamptz not null default now(),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint shift_assignments_shift_fk
    foreign key (shift_id, company_id)
    references public.shifts(id, company_id) on delete cascade,
  constraint shift_assignments_employee_fk
    foreign key (employee_id, company_id)
    references public.profiles(id, company_id) on delete cascade
);

create unique index if not exists shift_assignments_unique
  on public.shift_assignments (shift_id, employee_id)
  where deleted_at is null;
create index if not exists shift_assignments_employee_idx on public.shift_assignments (employee_id);

-- ---------------------------------------------------------------------
-- Vaktjournal
-- ---------------------------------------------------------------------
create table if not exists public.journals (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  shift_id    uuid not null,
  employee_id uuid not null,
  status      text not null default 'apen' check (status in ('apen','avsluttet')),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, company_id),
  unique (shift_id),
  constraint journals_shift_fk
    foreign key (shift_id, company_id)
    references public.shifts(id, company_id) on delete cascade,
  constraint journals_employee_fk
    foreign key (employee_id, company_id)
    references public.profiles(id, company_id) on delete cascade
);

create table if not exists public.journal_entries (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  journal_id        uuid not null,
  author_id         uuid not null,
  entry_type        text not null
    check (entry_type in ('vakt_start','vakt_slutt','kontrollrunde','apning','lasing',
                          'observasjon','hendelse','avvik','notat','rettelse')),
  occurred_at       timestamptz not null default now(),
  body              text not null,
  location          text,
  attachment_paths  text[] not null default '{}',
  -- Rettelser lagres som nye poster som peker pa den opprinnelige.
  corrects_entry_id uuid references public.journal_entries(id) on delete restrict,
  created_at        timestamptz not null default now(),
  constraint journal_entries_journal_fk
    foreign key (journal_id, company_id)
    references public.journals(id, company_id) on delete cascade,
  constraint journal_entries_author_fk
    foreign key (author_id, company_id)
    references public.profiles(id, company_id) on delete cascade
);

create index if not exists journal_entries_journal_idx on public.journal_entries (journal_id, occurred_at);

-- ---------------------------------------------------------------------
-- Rapporter
-- ---------------------------------------------------------------------
create table if not exists public.reports (
  id                     uuid primary key default gen_random_uuid(),
  company_id             uuid not null references public.companies(id) on delete cascade,
  report_number          text not null,
  report_type            text not null
    check (report_type in ('avvik','hendelse','utrykning','maktbruk','skade','vaktrapport')),
  status                 text not null default 'utkast'
    check (status in ('utkast','innsendt','under_behandling','ferdigbehandlet')),
  site_id                uuid,
  shift_id               uuid,
  reporter_id            uuid not null,
  occurred_at            timestamptz not null default now(),
  title                  text not null,
  description            text,
  sequence_of_events     text,
  actions_taken          text,
  notified               text,
  witnesses              text,
  personal_injury        boolean not null default false,
  personal_injury_details text,
  material_damage        boolean not null default false,
  material_damage_details text,
  physical_force         boolean not null default false,
  physical_force_details text,
  police_notified        boolean not null default false,
  submitted_at           timestamptz,
  handler_id             uuid references public.profiles(id) on delete set null,
  handling_note          text,
  closed_at              timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  unique (id, company_id),
  unique (company_id, report_number),
  constraint reports_site_fk
    foreign key (site_id, company_id)
    references public.sites(id, company_id) on delete set null,
  constraint reports_shift_fk
    foreign key (shift_id, company_id)
    references public.shifts(id, company_id) on delete set null,
  constraint reports_reporter_fk
    foreign key (reporter_id, company_id)
    references public.profiles(id, company_id) on delete cascade
);

create index if not exists reports_company_status_idx on public.reports (company_id, status);
create index if not exists reports_reporter_idx       on public.reports (reporter_id);

create sequence if not exists public.report_number_seq;

create table if not exists public.report_attachments (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  report_id    uuid not null,
  storage_path text not null,
  file_name    text not null,
  mime_type    text,
  size_bytes   integer,
  uploaded_by  uuid not null,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  constraint report_attachments_report_fk
    foreign key (report_id, company_id)
    references public.reports(id, company_id) on delete cascade,
  constraint report_attachments_uploader_fk
    foreign key (uploaded_by, company_id)
    references public.profiles(id, company_id) on delete cascade
);

-- Utvidet tilgang til en enkeltrapport, gitt av administrator.
create table if not exists public.report_shares (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  report_id  uuid not null,
  profile_id uuid not null,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint report_shares_report_fk
    foreign key (report_id, company_id)
    references public.reports(id, company_id) on delete cascade,
  constraint report_shares_profile_fk
    foreign key (profile_id, company_id)
    references public.profiles(id, company_id) on delete cascade
);

create unique index if not exists report_shares_unique
  on public.report_shares (report_id, profile_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- Instrukser
-- ---------------------------------------------------------------------
create table if not exists public.instructions (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references public.companies(id) on delete cascade,
  title                    text not null,
  summary                  text,
  body                     text,
  site_id                  uuid,
  version                  integer not null default 1,
  valid_from               date not null default current_date,
  valid_to                 date,
  requires_acknowledgement boolean not null default true,
  document_path            text,
  created_by               uuid references public.profiles(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz,
  unique (id, company_id),
  constraint instructions_site_fk
    foreign key (site_id, company_id)
    references public.sites(id, company_id) on delete set null
);

create table if not exists public.instruction_assignments (
  id                       uuid primary key default gen_random_uuid(),
  company_id               uuid not null references public.companies(id) on delete cascade,
  instruction_id           uuid not null,
  profile_id               uuid,
  site_id                  uuid,
  shift_id                 uuid,
  department_id            uuid,
  site_role                text references public.roles(key),
  valid_from               date not null default current_date,
  valid_to                 date,
  requires_acknowledgement boolean not null default true,
  assigned_by              uuid references public.profiles(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz,
  constraint instruction_assignments_instruction_fk
    foreign key (instruction_id, company_id)
    references public.instructions(id, company_id) on delete cascade,
  constraint instruction_assignments_profile_fk
    foreign key (profile_id, company_id)
    references public.profiles(id, company_id) on delete cascade,
  constraint instruction_assignments_site_fk
    foreign key (site_id, company_id)
    references public.sites(id, company_id) on delete cascade,
  constraint instruction_assignments_shift_fk
    foreign key (shift_id, company_id)
    references public.shifts(id, company_id) on delete cascade,
  constraint instruction_assignments_department_fk
    foreign key (department_id, company_id)
    references public.departments(id, company_id) on delete cascade,
  -- Minst ett maal ma vaere satt - instrukser blir aldri synlige for alle.
  constraint instruction_assignments_target_chk
    check (num_nonnulls(profile_id, site_id, shift_id, department_id) >= 1),
  constraint instruction_assignments_site_role_chk
    check (site_role is null or site_id is not null),
  constraint instruction_assignments_period_chk
    check (valid_to is null or valid_to >= valid_from)
);

create index if not exists instruction_assignments_instruction_idx
  on public.instruction_assignments (instruction_id);
create index if not exists instruction_assignments_profile_idx
  on public.instruction_assignments (profile_id);

create table if not exists public.instruction_acknowledgements (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  instruction_id  uuid not null,
  profile_id      uuid not null,
  version         integer not null,
  acknowledged_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  constraint instruction_ack_instruction_fk
    foreign key (instruction_id, company_id)
    references public.instructions(id, company_id) on delete cascade,
  constraint instruction_ack_profile_fk
    foreign key (profile_id, company_id)
    references public.profiles(id, company_id) on delete cascade,
  unique (instruction_id, profile_id, version)
);

-- ---------------------------------------------------------------------
-- Kurs, godkjenninger og dokumenter
-- ---------------------------------------------------------------------
create table if not exists public.qualifications (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  profile_id         uuid not null,
  name               text not null,
  kind               text not null default 'kurs'
    check (kind in ('kurs','godkjenning','dokument')),
  issuer             text,
  certificate_number text,
  issued_on          date,
  expires_on         date,
  document_path      text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz,
  constraint qualifications_profile_fk
    foreign key (profile_id, company_id)
    references public.profiles(id, company_id) on delete cascade
);

create index if not exists qualifications_profile_idx on public.qualifications (profile_id);

-- ---------------------------------------------------------------------
-- Varslinger
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null,
  title      text not null,
  body       text,
  kind       text not null default 'info'
    check (kind in ('info','vakt','instruks','rapport','kurs','avvik')),
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint notifications_profile_fk
    foreign key (profile_id, company_id)
    references public.profiles(id, company_id) on delete cascade
);

create index if not exists notifications_profile_idx on public.notifications (profile_id, created_at desc);

-- ---------------------------------------------------------------------
-- Revisjonslogg
-- ---------------------------------------------------------------------
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  table_name text not null,
  row_id     uuid,
  old_value  jsonb,
  new_value  jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_company_idx on public.audit_logs (company_id, created_at desc);
create index if not exists audit_logs_row_idx     on public.audit_logs (table_name, row_id);


-- ---------------------------------------------------------------------
-- 20260824090100_funksjoner.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- Hjelpefunksjoner og triggere
-- Funksjonene er SECURITY DEFINER slik at de kan lese oppslagsdata uten
-- a utlose rekursive RLS-sjekker. search_path er last for a hindre at
-- objekter kan kapres via en annen search_path.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Hvem er innlogget?
-- Deaktiverte og slettede brukere far null/false og dermed ingen tilgang.
-- ---------------------------------------------------------------------
create or replace function public.current_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.company_id from public.profiles p
  where p.id = auth.uid() and p.is_active and p.deleted_at is null;
$$;

create or replace function public.current_role_key()
returns text language sql stable security definer set search_path = public as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active and p.deleted_at is null;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_key() = 'administrator', false);
$$;

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_key() in ('operativ_leder','administrator'), false);
$$;

-- ---------------------------------------------------------------------
-- Ansvarsomrade for operativ leder
-- ---------------------------------------------------------------------
create or replace function public.manager_can_access_site(p_site uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1
    from public.manager_scopes ms
    join public.sites s on s.id = p_site and s.deleted_at is null
    where ms.manager_id = auth.uid()
      and ms.deleted_at is null
      and ms.company_id = s.company_id
      and ms.company_id = public.current_company_id()
      and (ms.site_id = s.id
        or (ms.department_id is not null and ms.department_id = s.department_id))
  );
$$;

create or replace function public.manager_can_access_profile(p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1
    from public.manager_scopes ms
    join public.profiles p on p.id = p_profile and p.deleted_at is null
    where ms.manager_id = auth.uid()
      and ms.deleted_at is null
      and ms.company_id = p.company_id
      and ms.company_id = public.current_company_id()
      and (
        (ms.department_id is not null and ms.department_id = p.department_id)
        or (ms.site_id is not null and exists (
              select 1 from public.employee_site_access esa
              where esa.profile_id = p.id
                and esa.site_id = ms.site_id
                and esa.deleted_at is null
                and esa.valid_from <= current_date
                and (esa.valid_to is null or esa.valid_to >= current_date)))
      )
  );
$$;

-- ---------------------------------------------------------------------
-- Ansattes egne data
-- ---------------------------------------------------------------------

-- Er vakten tildelt den innloggede brukeren?
create or replace function public.is_my_shift(p_shift uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shift_assignments sa
    where sa.shift_id = p_shift
      and sa.employee_id = auth.uid()
      and sa.deleted_at is null
      and sa.status in ('tildelt','godkjent')
  );
$$;

-- Har brukeren tilgang til objektet, enten via tildelt objekttilgang
-- eller fordi brukeren har en vakt der?
create or replace function public.has_site_access(p_site uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.employee_site_access esa
    where esa.profile_id = auth.uid()
      and esa.site_id = p_site
      and esa.deleted_at is null
      and esa.valid_from <= current_date
      and (esa.valid_to is null or esa.valid_to >= current_date)
  ) or exists (
    select 1
    from public.shift_assignments sa
    join public.shifts s on s.id = sa.shift_id
    where sa.employee_id = auth.uid()
      and sa.deleted_at is null
      and sa.status in ('tildelt','godkjent')
      and s.site_id = p_site
      and s.deleted_at is null
  );
$$;

-- Er ledige vakter aktivert for selskapet?
create or replace function public.open_shifts_enabled()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select c.open_shifts_enabled from public.companies c
                   where c.id = public.current_company_id()), false);
$$;

-- ---------------------------------------------------------------------
-- Instrukstilgang
-- En instruks er synlig kun nar administrator har tildelt den, direkte
-- eller via objekt, avdeling, vakt eller rolle ved objekt.
-- ---------------------------------------------------------------------
create or replace function public.has_instruction_access(p_instruction uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.instruction_assignments ia
    join public.profiles p on p.id = auth.uid() and p.is_active and p.deleted_at is null
    where ia.instruction_id = p_instruction
      and ia.deleted_at is null
      and ia.company_id = p.company_id
      and ia.valid_from <= current_date
      and (ia.valid_to is null or ia.valid_to >= current_date)
      and (
        -- direkte til den ansatte
        ia.profile_id = p.id
        -- hele avdelingen
        or (ia.department_id is not null and ia.department_id = p.department_id)
        -- knyttet til en bestemt vakt den ansatte har
        or (ia.shift_id is not null and public.is_my_shift(ia.shift_id))
        -- objekt, eventuelt begrenset til en bestemt rolle ved objektet
        or (ia.site_id is not null
            and (ia.site_role is null or ia.site_role = p.role)
            and public.has_site_access(ia.site_id))
      )
  );
$$;

-- ---------------------------------------------------------------------
-- Journaltilgang
-- ---------------------------------------------------------------------

-- Kan brukeren skrive i journalen for vakten na?
create or replace function public.can_use_journal(p_shift uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.shifts s
    join public.companies c on c.id = s.company_id
    where s.id = p_shift
      and s.deleted_at is null
      and s.status <> 'avlyst'
      and public.is_my_shift(s.id)
      and public.has_site_access(s.site_id)
      and now() >= s.starts_at - make_interval(mins => c.journal_open_before_minutes)
      and now() <= s.ends_at   + make_interval(mins => c.journal_open_after_minutes)
  );
$$;

create or replace function public.can_read_journal(p_journal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.journals j
    join public.shifts s on s.id = j.shift_id
    where j.id = p_journal
      and j.company_id = public.current_company_id()
      and (
        j.employee_id = auth.uid()
        or public.is_admin()
        or public.manager_can_access_site(s.site_id)
      )
  );
$$;

-- ---------------------------------------------------------------------
-- Rapporttilgang
-- ---------------------------------------------------------------------
create or replace function public.can_read_report(p_report uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report
      and r.company_id = public.current_company_id()
      and (
        r.reporter_id = auth.uid()
        or public.is_admin()
        or (public.is_manager() and (
              (r.site_id is not null and public.manager_can_access_site(r.site_id))
              or public.manager_can_access_profile(r.reporter_id)))
        or exists (select 1 from public.report_shares rs
                   where rs.report_id = r.id
                     and rs.profile_id = auth.uid()
                     and rs.deleted_at is null)
      )
  );
$$;

-- =====================================================================
-- Triggere
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'companies','departments','profiles','customers','sites','site_contacts',
    'manager_scopes','employee_site_access','shifts','shift_assignments',
    'journals','reports','instructions','instruction_assignments','qualifications'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Revisjonslogg
-- ---------------------------------------------------------------------
create or replace function public.log_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_row     jsonb;
  v_company uuid;
  v_actor   uuid;
begin
  v_row := to_jsonb(coalesce(new, old));
  v_company := nullif(v_row ->> 'company_id', '')::uuid;
  select p.id into v_actor from public.profiles p where p.id = auth.uid();

  insert into public.audit_logs (company_id, actor_id, action, table_name, row_id, old_value, new_value)
  values (
    v_company,
    v_actor,
    lower(tg_op),
    tg_table_name,
    nullif(v_row ->> 'id', '')::uuid,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','employee_site_access','manager_scopes','shifts','shift_assignments',
    'instructions','instruction_assignments','instruction_acknowledgements',
    'reports','qualifications','site_contacts','report_shares'
  ] loop
    execute format('drop trigger if exists log_audit on public.%I', t);
    execute format('create trigger log_audit after insert or update or delete on public.%I
                    for each row execute function public.log_audit()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Profil: ingen kan endre egen rolle, tilgang eller selskap
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() = null betyr at endringen kommer fra serveren med
  -- service-nokkel, altsa en allerede privilegert kanal.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.company_id is distinct from old.company_id
       or new.department_id is distinct from old.department_id
       or new.employee_number is distinct from old.employee_number
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Rolle, tilgang og selskap kan bare endres av administrator'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles
for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- Rapport: nummerering og lasing ved innsending
-- ---------------------------------------------------------------------
create or replace function public.set_report_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.report_number is null or new.report_number = '' then
    new.report_number := 'AVR-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.report_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_report_number on public.reports;
create trigger set_report_number before insert on public.reports
for each row execute function public.set_report_number();

create or replace function public.guard_report_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Faste felter kan aldri endres
  if new.report_number is distinct from old.report_number
     or new.reporter_id is distinct from old.reporter_id
     or new.company_id is distinct from old.company_id then
    raise exception 'Rapportnummer, rapportor og selskap kan ikke endres'
      using errcode = '42501';
  end if;

  -- Nar rapporten er sendt inn, er innholdet last for rapportoren.
  if auth.uid() is not null and not public.is_manager() then
    if old.status <> 'utkast' then
      raise exception 'Innsendt rapport kan ikke endres av rapportoren'
        using errcode = '42501';
    end if;
    if new.status not in ('utkast','innsendt') then
      raise exception 'Bare saksbehandler kan endre status videre'
        using errcode = '42501';
    end if;
    -- Saksbehandlingsfelter er forbeholdt ledelsen
    if new.handler_id is distinct from old.handler_id
       or new.handling_note is distinct from old.handling_note
       or new.closed_at is distinct from old.closed_at then
      raise exception 'Saksbehandlingsfelter kan bare endres av ledelsen'
        using errcode = '42501';
    end if;
  end if;

  if new.status = 'innsendt' and old.status = 'utkast' then
    new.submitted_at := now();
  end if;
  if new.status = 'ferdigbehandlet' and old.status <> 'ferdigbehandlet' then
    new.closed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists guard_report_update on public.reports;
create trigger guard_report_update before update on public.reports
for each row execute function public.guard_report_update();

-- ---------------------------------------------------------------------
-- Lesebekreftelse skal alltid gjelde gjeldende versjon
-- ---------------------------------------------------------------------
create or replace function public.set_acknowledgement_version()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_version integer;
begin
  select i.version into v_version from public.instructions i where i.id = new.instruction_id;
  if v_version is null then
    raise exception 'Ukjent instruks' using errcode = '23503';
  end if;
  new.version := v_version;
  new.acknowledged_at := now();
  return new;
end;
$$;

drop trigger if exists set_acknowledgement_version on public.instruction_acknowledgements;
create trigger set_acknowledgement_version before insert on public.instruction_acknowledgements
for each row execute function public.set_acknowledgement_version();

-- Ny versjon av en instruks krever ny lesebekreftelse. Versjonsnummeret
-- oker automatisk nar innholdet endres.
create or replace function public.bump_instruction_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.body is distinct from old.body
     or new.title is distinct from old.title
     or new.summary is distinct from old.summary
     or new.document_path is distinct from old.document_path then
    if new.version = old.version then
      new.version := old.version + 1;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists bump_instruction_version on public.instructions;
create trigger bump_instruction_version before update on public.instructions
for each row execute function public.bump_instruction_version();

-- ---------------------------------------------------------------------
-- Varsler: ansatte kan bare markere som lest
-- ---------------------------------------------------------------------
create or replace function public.guard_notification_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.title is distinct from old.title
       or new.body is distinct from old.body
       or new.kind is distinct from old.kind
       or new.link is distinct from old.link
       or new.profile_id is distinct from old.profile_id then
      raise exception 'Bare lesestatus kan endres' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_notification_update on public.notifications;
create trigger guard_notification_update before update on public.notifications
for each row execute function public.guard_notification_update();

-- ---------------------------------------------------------------------
-- Journal: en apen journal per vakt, og status folger vakten
-- ---------------------------------------------------------------------
create or replace function public.guard_journal_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.shift_id is distinct from old.shift_id
     or new.employee_id is distinct from old.employee_id then
    raise exception 'Journalen kan ikke flyttes til en annen vakt eller ansatt'
      using errcode = '42501';
  end if;
  if old.status = 'avsluttet' and auth.uid() is not null and not public.is_admin() then
    raise exception 'Avsluttet journal kan ikke gjenapnes' using errcode = '42501';
  end if;
  if new.status = 'avsluttet' and old.status = 'apen' and new.ended_at is null then
    new.ended_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists guard_journal_update on public.journals;
create trigger guard_journal_update before update on public.journals
for each row execute function public.guard_journal_update();


-- ---------------------------------------------------------------------
-- 20260824090200_rls.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- Row Level Security
-- Utgangspunktet er at ingenting er lesbart. Hver policy apner presist
-- det en rolle skal se, og alle policyer er avgrenset til eget selskap.
-- =====================================================================

-- Migrasjonen skal kunne kjores flere ganger. Policyene under opprettes
-- pa nytt hver gang, sa eksisterende utgaver fjernes forst.
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'companies','roles','departments','profiles','customers','sites','site_contacts',
        'manager_scopes','employee_site_access','shifts','shift_assignments','journals',
        'journal_entries','reports','report_attachments','report_shares','instructions',
        'instruction_assignments','instruction_acknowledgements','qualifications',
        'notifications','audit_logs')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.roles to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'companies','roles','departments','profiles','customers','sites','site_contacts',
    'manager_scopes','employee_site_access','shifts','shift_assignments','journals',
    'journal_entries','reports','report_attachments','report_shares','instructions',
    'instruction_assignments','instruction_acknowledgements','qualifications',
    'notifications','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Journalposter skal aldri kunne endres eller slettes via API-et.
revoke update, delete on public.journal_entries from authenticated;
-- Revisjonsloggen skrives kun av triggere (SECURITY DEFINER).
revoke insert, update, delete on public.audit_logs from authenticated;
-- Lesebekreftelser kan ikke trekkes tilbake av den ansatte.
revoke update, delete on public.instruction_acknowledgements from authenticated;

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------
create policy companies_select on public.companies for select to authenticated
  using (id = public.current_company_id());
create policy companies_update on public.companies for update to authenticated
  using (id = public.current_company_id() and public.is_admin())
  with check (id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- roles (oppslag)
-- ---------------------------------------------------------------------
create policy roles_select on public.roles for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- departments
-- ---------------------------------------------------------------------
create policy departments_select on public.departments for select to authenticated
  using (
    company_id = public.current_company_id()
    and (
      public.is_admin()
      or exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.department_id = departments.id)
      or exists (select 1 from public.manager_scopes ms
                 where ms.manager_id = auth.uid() and ms.deleted_at is null
                   and ms.department_id = departments.id)
    )
  );
create policy departments_admin_write on public.departments for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- profiles
-- En ansatt ser bare seg selv. Operativ leder ser sitt ansvarsomrade.
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (
    -- Egen profil, men bare sa lenge kontoen er aktiv. En deaktivert bruker
    -- skal ikke kunne lese noe som helst.
    (id = auth.uid() and is_active and deleted_at is null)
    or (company_id = public.current_company_id()
        and (public.is_admin() or public.manager_can_access_profile(id)))
  );
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() and is_active and deleted_at is null)
  with check (id = auth.uid());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());
create policy profiles_admin_insert on public.profiles for insert to authenticated
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- customers
-- Ansatte ser bare kunden bak et objekt de har tilgang til.
-- ---------------------------------------------------------------------
create policy customers_select on public.customers for select to authenticated
  using (
    company_id = public.current_company_id()
    and (
      public.is_admin()
      or exists (
        select 1 from public.sites s
        where s.customer_id = customers.id
          and s.deleted_at is null
          and (public.has_site_access(s.id) or public.manager_can_access_site(s.id))
      )
    )
  );
create policy customers_admin_write on public.customers for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- sites
-- ---------------------------------------------------------------------
create policy sites_select on public.sites for select to authenticated
  using (
    company_id = public.current_company_id()
    and (public.is_admin() or public.manager_can_access_site(id) or public.has_site_access(id))
  );
create policy sites_admin_write on public.sites for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- site_contacts
-- Kontaktperson vises bare nar administrator har merket den som synlig.
-- ---------------------------------------------------------------------
create policy site_contacts_select on public.site_contacts for select to authenticated
  using (
    company_id = public.current_company_id()
    and deleted_at is null
    and (
      public.is_admin()
      or public.manager_can_access_site(site_id)
      or (visible_to_employee and public.has_site_access(site_id))
    )
  );
create policy site_contacts_admin_write on public.site_contacts for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- manager_scopes
-- ---------------------------------------------------------------------
create policy manager_scopes_select on public.manager_scopes for select to authenticated
  using (company_id = public.current_company_id()
         and (manager_id = auth.uid() or public.is_admin()));
create policy manager_scopes_admin_write on public.manager_scopes for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- employee_site_access
-- ---------------------------------------------------------------------
create policy employee_site_access_select on public.employee_site_access for select to authenticated
  using (
    company_id = public.current_company_id()
    and (profile_id = auth.uid() or public.is_admin() or public.manager_can_access_profile(profile_id))
  );
create policy employee_site_access_admin_write on public.employee_site_access for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- shifts
-- Ansatte ser bare egne vakter, og eventuelt ledige vakter dersom
-- funksjonen er aktivert for selskapet.
-- ---------------------------------------------------------------------
create policy shifts_select on public.shifts for select to authenticated
  using (
    company_id = public.current_company_id()
    and (
      public.is_admin()
      or public.manager_can_access_site(site_id)
      or public.is_my_shift(id)
      or (status = 'ledig' and deleted_at is null and public.open_shifts_enabled())
    )
  );
create policy shifts_admin_write on public.shifts for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- shift_assignments
-- Ansatte ser aldri hvem andre som gar en vakt.
-- ---------------------------------------------------------------------
create policy shift_assignments_select on public.shift_assignments for select to authenticated
  using (
    company_id = public.current_company_id()
    and (employee_id = auth.uid() or public.is_admin() or public.manager_can_access_profile(employee_id))
  );
create policy shift_assignments_apply on public.shift_assignments for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and employee_id = auth.uid()
    and status = 'soknad'
    and public.open_shifts_enabled()
    and exists (select 1 from public.shifts s
                where s.id = shift_id and s.status = 'ledig' and s.deleted_at is null)
  );
create policy shift_assignments_withdraw on public.shift_assignments for update to authenticated
  using (company_id = public.current_company_id() and employee_id = auth.uid() and status = 'soknad')
  with check (company_id = public.current_company_id() and employee_id = auth.uid()
              and status in ('soknad','trukket'));
create policy shift_assignments_admin_write on public.shift_assignments for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- journals
-- ---------------------------------------------------------------------
create policy journals_select on public.journals for select to authenticated
  using (company_id = public.current_company_id() and public.can_read_journal(id));
create policy journals_insert on public.journals for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and employee_id = auth.uid()
    and public.can_use_journal(shift_id)
  );
create policy journals_update_own on public.journals for update to authenticated
  using (company_id = public.current_company_id() and employee_id = auth.uid()
         and status = 'apen' and public.can_use_journal(shift_id))
  with check (company_id = public.current_company_id() and employee_id = auth.uid());
create policy journals_admin_update on public.journals for update to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- journal_entries
-- Ingen update/delete-policy: journalposter er permanente. Rettelser
-- registreres som nye poster med referanse til den opprinnelige.
-- ---------------------------------------------------------------------
create policy journal_entries_select on public.journal_entries for select to authenticated
  using (company_id = public.current_company_id() and public.can_read_journal(journal_id));
create policy journal_entries_insert on public.journal_entries for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and author_id = auth.uid()
    and exists (
      select 1 from public.journals j
      where j.id = journal_id
        and j.employee_id = auth.uid()
        and j.status = 'apen'
        and public.can_use_journal(j.shift_id)
    )
  );

-- ---------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------
create policy reports_select on public.reports for select to authenticated
  using (company_id = public.current_company_id() and public.can_read_report(id));
create policy reports_insert on public.reports for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and reporter_id = auth.uid()
    and status = 'utkast'
  );
create policy reports_update_own_draft on public.reports for update to authenticated
  using (company_id = public.current_company_id() and reporter_id = auth.uid() and status = 'utkast')
  with check (company_id = public.current_company_id() and reporter_id = auth.uid()
              and status in ('utkast','innsendt'));
create policy reports_manager_update on public.reports for update to authenticated
  using (company_id = public.current_company_id() and public.is_manager() and public.can_read_report(id))
  with check (company_id = public.current_company_id() and public.is_manager());
create policy reports_delete_own_draft on public.reports for delete to authenticated
  using (company_id = public.current_company_id()
         and ((reporter_id = auth.uid() and status = 'utkast') or public.is_admin()));

-- ---------------------------------------------------------------------
-- report_attachments
-- ---------------------------------------------------------------------
create policy report_attachments_select on public.report_attachments for select to authenticated
  using (company_id = public.current_company_id() and public.can_read_report(report_id));
create policy report_attachments_insert on public.report_attachments for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and uploaded_by = auth.uid()
    and exists (select 1 from public.reports r
                where r.id = report_id
                  and ((r.reporter_id = auth.uid() and r.status = 'utkast') or public.is_manager()))
  );
create policy report_attachments_delete on public.report_attachments for delete to authenticated
  using (
    company_id = public.current_company_id()
    and exists (select 1 from public.reports r
                where r.id = report_id
                  and ((r.reporter_id = auth.uid() and r.status = 'utkast') or public.is_admin()))
  );

-- ---------------------------------------------------------------------
-- report_shares
-- ---------------------------------------------------------------------
create policy report_shares_select on public.report_shares for select to authenticated
  using (company_id = public.current_company_id()
         and (profile_id = auth.uid() or public.is_admin()));
create policy report_shares_admin_write on public.report_shares for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- instructions
-- ---------------------------------------------------------------------
create policy instructions_select on public.instructions for select to authenticated
  using (
    company_id = public.current_company_id()
    and deleted_at is null
    and (
      public.is_admin()
      or (public.is_manager() and site_id is not null and public.manager_can_access_site(site_id))
      or public.has_instruction_access(id)
    )
  );
create policy instructions_admin_write on public.instructions for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- instruction_assignments
-- En ansatt kan se sin egen tildeling, men aldri tildelinger til andre.
-- ---------------------------------------------------------------------
create policy instruction_assignments_select on public.instruction_assignments for select to authenticated
  using (
    company_id = public.current_company_id()
    and (
      public.is_admin()
      or profile_id = auth.uid()
      or (profile_id is null and public.has_instruction_access(instruction_id))
      or (public.is_manager() and site_id is not null and public.manager_can_access_site(site_id))
    )
  );
create policy instruction_assignments_admin_write on public.instruction_assignments for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- instruction_acknowledgements
-- ---------------------------------------------------------------------
create policy instruction_ack_select on public.instruction_acknowledgements for select to authenticated
  using (
    company_id = public.current_company_id()
    and (profile_id = auth.uid() or public.is_admin() or public.manager_can_access_profile(profile_id))
  );
create policy instruction_ack_insert on public.instruction_acknowledgements for insert to authenticated
  with check (
    company_id = public.current_company_id()
    and profile_id = auth.uid()
    and public.has_instruction_access(instruction_id)
  );

-- ---------------------------------------------------------------------
-- qualifications
-- ---------------------------------------------------------------------
create policy qualifications_select on public.qualifications for select to authenticated
  using (
    company_id = public.current_company_id()
    and (profile_id = auth.uid() or public.is_admin() or public.manager_can_access_profile(profile_id))
  );
create policy qualifications_admin_write on public.qualifications for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (company_id = public.current_company_id()
         and (profile_id = auth.uid() or public.is_admin()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (company_id = public.current_company_id() and profile_id = auth.uid())
  with check (company_id = public.current_company_id() and profile_id = auth.uid());
create policy notifications_admin_write on public.notifications for all to authenticated
  using (company_id = public.current_company_id() and public.is_admin())
  with check (company_id = public.current_company_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- audit_logs (kun administrator kan lese)
-- ---------------------------------------------------------------------
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (company_id = public.current_company_id() and public.is_admin());


-- ---------------------------------------------------------------------
-- 20260824090300_lagring.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- Privat fillagring
-- Alle bøtter er private. Filer hentes kun via tidsbegrensede, signerte
-- lenker som genereres på serveren.
-- Stikonvensjon: {company_id}/{eier_id}/{filnavn}
-- =====================================================================

-- Trygg konvertering av mappenavn til uuid (feil sti gir null, ikke feil).
create or replace function public.try_uuid(p_value text)
returns uuid language plpgsql immutable as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

do $$
declare r record;
begin
  if not exists (select 1 from pg_namespace where nspname = 'storage') then
    raise notice 'storage-skjemaet finnes ikke (kjorer utenfor Supabase) - hopper over';
    return;
  end if;

  -- Rydder bort tidligere utgaver slik at filen kan kjores om igjen.
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'rapport_vedlegg_les','rapport_vedlegg_skriv','journal_vedlegg_les',
        'journal_vedlegg_skriv','instruks_dokument_les','instruks_dokument_skriv',
        'kvalifikasjon_les','kvalifikasjon_skriv')
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;

  insert into storage.buckets (id, name, public)
  values ('rapport-vedlegg',     'rapport-vedlegg',     false),
         ('journal-vedlegg',     'journal-vedlegg',     false),
         ('instruks-dokumenter', 'instruks-dokumenter', false),
         ('kvalifikasjoner',     'kvalifikasjoner',     false)
  on conflict (id) do update set public = false;

  -- Rapportvedlegg
  execute $p$
    create policy "rapport_vedlegg_les" on storage.objects for select to authenticated
    using (
      bucket_id = 'rapport-vedlegg'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and public.can_read_report(public.try_uuid((storage.foldername(name))[2]))
    )$p$;
  execute $p$
    create policy "rapport_vedlegg_skriv" on storage.objects for insert to authenticated
    with check (
      bucket_id = 'rapport-vedlegg'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and exists (
        select 1 from public.reports r
        where r.id = public.try_uuid((storage.foldername(name))[2])
          and ((r.reporter_id = auth.uid() and r.status = 'utkast') or public.is_manager())
      )
    )$p$;

  -- Journalvedlegg
  execute $p$
    create policy "journal_vedlegg_les" on storage.objects for select to authenticated
    using (
      bucket_id = 'journal-vedlegg'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and public.can_read_journal(public.try_uuid((storage.foldername(name))[2]))
    )$p$;
  execute $p$
    create policy "journal_vedlegg_skriv" on storage.objects for insert to authenticated
    with check (
      bucket_id = 'journal-vedlegg'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and exists (
        select 1 from public.journals j
        where j.id = public.try_uuid((storage.foldername(name))[2])
          and j.employee_id = auth.uid()
          and j.status = 'apen'
      )
    )$p$;

  -- Instruksdokumenter (kun administrator laster opp)
  execute $p$
    create policy "instruks_dokument_les" on storage.objects for select to authenticated
    using (
      bucket_id = 'instruks-dokumenter'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and (public.is_admin()
           or public.has_instruction_access(public.try_uuid((storage.foldername(name))[2])))
    )$p$;
  execute $p$
    create policy "instruks_dokument_skriv" on storage.objects for all to authenticated
    using (
      bucket_id = 'instruks-dokumenter'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and public.is_admin()
    )
    with check (
      bucket_id = 'instruks-dokumenter'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and public.is_admin()
    )$p$;

  -- Kurs- og kompetansedokumenter
  execute $p$
    create policy "kvalifikasjon_les" on storage.objects for select to authenticated
    using (
      bucket_id = 'kvalifikasjoner'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and (public.try_uuid((storage.foldername(name))[2]) = auth.uid()
           or public.is_admin()
           or public.manager_can_access_profile(public.try_uuid((storage.foldername(name))[2])))
    )$p$;
  execute $p$
    create policy "kvalifikasjon_skriv" on storage.objects for all to authenticated
    using (
      bucket_id = 'kvalifikasjoner'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and public.is_admin()
    )
    with check (
      bucket_id = 'kvalifikasjoner'
      and (storage.foldername(name))[1] = public.current_company_id()::text
      and public.is_admin()
    )$p$;
exception
  when insufficient_privilege then
    raise notice 'Mangler rettigheter til a lage policyer pa storage.objects. '
      'Opprett dem i stedet under Storage -> Policies i Supabase.';
end;
$$;

