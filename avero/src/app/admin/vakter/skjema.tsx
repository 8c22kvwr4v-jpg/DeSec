'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CalendarPlus } from 'lucide-react';
import { opprettVakt, tildelVakt, endreVaktstatus, type Adminstilstand } from '@/server/actions/admin';
import { Beskjed, Knapp, Kort } from '@/components/ui';
import { Avkryssing, Felt, Nedtrekk, Tekstfelt, Tekstområde } from '@/components/skjemafelt';
import { vaktstatusNavn, vakttypeNavn } from '@/lib/etiketter';
import { toLocalInputValue } from '@/lib/dates';
import type { Profile, Site, Vaktstatus, Vakttype } from '@/lib/database.types';

const TYPER: Vakttype[] = [
  'stasjonaer', 'rundering', 'arrangement', 'utrykning', 'resepsjon', 'verditransport',
];
const STATUSER: Vaktstatus[] = [
  'planlagt', 'ledig', 'tildelt', 'pagaende', 'fullfort', 'avlyst',
];

function Send({ tekst, venter }: { tekst: string; venter: string }) {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      {pending ? venter : tekst}
    </Knapp>
  );
}

export function NyVaktSkjema({
  objekter, ansatte, standardStart,
}: { objekter: Site[]; ansatte: Profile[]; standardStart: Date }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(opprettVakt, {});
  const slutt = new Date(standardStart.getTime() + 8 * 3600_000);

  return (
    <Kort className="p-4 sm:p-5">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
        <CalendarPlus className="h-5 w-5 text-aksent-lys" strokeWidth={2} />
        Ny vakt
      </h2>
      <p className="mb-4 text-sm text-tekst-dempet">
        Velg hvilken ansatt vakten tilhører. Vakten blir bare synlig for denne ansatte
        og for ledere med ansvar for objektet.
      </p>

      <form action={send} className="space-y-4">
        {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
        {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}

        <Felt etikett="Objekt" påkrevd>
          <Nedtrekk name="objektId" required defaultValue="">
            <option value="" disabled>Velg objekt</option>
            {objekter.map((objekt) => (
              <option key={objekt.id} value={objekt.id}>{objekt.name}</option>
            ))}
          </Nedtrekk>
        </Felt>

        <Felt etikett="Vakttype" påkrevd>
          <Nedtrekk name="type" defaultValue="stasjonaer" required>
            {TYPER.map((type) => (
              <option key={type} value={type}>{vakttypeNavn[type]}</option>
            ))}
          </Nedtrekk>
        </Felt>

        <div className="grid gap-4 sm:grid-cols-2">
          <Felt etikett="Start" påkrevd hjelp="Norsk tid, 24-timers klokke.">
            <Tekstfelt name="start" type="datetime-local" required
              defaultValue={toLocalInputValue(standardStart)} />
          </Felt>
          <Felt etikett="Slutt" påkrevd hjelp="Kan være neste døgn.">
            <Tekstfelt name="slutt" type="datetime-local" required
              defaultValue={toLocalInputValue(slutt)} />
          </Felt>
        </div>

        <Felt etikett="Ansatt" hjelp="La stå tom for å opprette en ubemannet vakt.">
          <Nedtrekk name="ansattId" defaultValue="">
            <option value="">Ingen tildelt</option>
            {ansatte.map((ansatt) => (
              <option key={ansatt.id} value={ansatt.id}>
                {ansatt.full_name}{ansatt.employee_number ? ` (${ansatt.employee_number})` : ''}
              </option>
            ))}
          </Nedtrekk>
        </Felt>

        <Felt etikett="Oppmøtested">
          <Tekstfelt name="oppmote" placeholder="For eksempel «Vaktbu port 1»" />
        </Felt>

        <Felt etikett="Merknader">
          <Tekstområde name="merknader" placeholder="Særskilte forhold for denne vakten." />
        </Felt>

        <Avkryssing
          name="utlys"
          etikett="Utlys som ledig vakt"
          beskrivelse="Ansatte kan søke på vakten. Gjelder bare når ingen er tildelt."
        />

        <Send tekst="Opprett vakt" venter="Oppretter …" />
      </form>
    </Kort>
  );
}

export function TildelSkjema({
  vaktId, ansatte,
}: { vaktId: string; ansatte: Profile[] }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(tildelVakt, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="vaktId" value={vaktId} />
      <Felt etikett="Tildel til ansatt" påkrevd>
        <Nedtrekk name="ansattId" required defaultValue="">
          <option value="" disabled>Velg ansatt</option>
          {ansatte.map((ansatt) => (
            <option key={ansatt.id} value={ansatt.id}>{ansatt.full_name}</option>
          ))}
        </Nedtrekk>
      </Felt>
      <Send tekst="Tildel vakt" venter="Tildeler …" />
    </form>
  );
}

export function StatusSkjema({
  vaktId, status,
}: { vaktId: string; status: Vaktstatus }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(endreVaktstatus, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="vaktId" value={vaktId} />
      <Felt etikett="Status">
        <Nedtrekk name="status" defaultValue={status}>
          {STATUSER.map((s) => (
            <option key={s} value={s}>{vaktstatusNavn[s]}</option>
          ))}
        </Nedtrekk>
      </Felt>
      <Send tekst="Lagre status" venter="Lagrer …" />
    </form>
  );
}
