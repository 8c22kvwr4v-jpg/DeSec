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
