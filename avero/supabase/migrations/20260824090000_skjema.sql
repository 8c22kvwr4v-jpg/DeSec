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
