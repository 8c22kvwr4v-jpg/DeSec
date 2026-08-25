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
