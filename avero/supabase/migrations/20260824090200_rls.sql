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
