'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Save, Send } from 'lucide-react';
import {
  lagreRapport, opprettRapport, sendInnRapport, type Rapporttilstand,
} from '@/server/actions/rapporter';
import { Beskjed, Knapp, Kort, Seksjon } from '@/components/ui';
import { Avkryssing, Felt, Nedtrekk, Tekstfelt, Tekstområde } from '@/components/skjemafelt';
import { Bildeopplasting } from '@/components/bildeopplasting';
import { rapporttypeNavn } from '@/lib/etiketter';
import { toLocalInputValue } from '@/lib/dates';
import type { Rapporttype, Report, Site } from '@/lib/database.types';

const TYPER: Rapporttype[] = [
  'avvik', 'hendelse', 'utrykning', 'maktbruk', 'skade', 'vaktrapport',
];

function LagreKnapp({ ny }: { ny: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      <Save className="h-5 w-5" strokeWidth={2} />
      {pending ? 'Lagrer …' : ny ? 'Opprett utkast' : 'Lagre utkast'}
    </Knapp>
  );
}

export function Rapportskjema({
  objekter, rapport, vaktId, objektId, mappe, selskapId,
}: {
  objekter: Site[];
  rapport?: Report;
  vaktId?: string;
  objektId?: string;
  mappe?: string;
  selskapId: string;
}) {
  const ny = !rapport;
  const [tilstand, send] = useActionState<Rapporttilstand, FormData>(
    ny ? opprettRapport : lagreRapport, {},
  );

  const [personskade, setPersonskade] = useState(rapport?.personal_injury ?? false);
  const [materiell, setMateriell] = useState(rapport?.material_damage ?? false);
  const [makt, setMakt] = useState(
    rapport?.physical_force ?? false,
  );

  return (
    <form action={send} className="space-y-6">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}

      {rapport && <input type="hidden" name="rapportId" value={rapport.id} />}
      <input type="hidden" name="vaktId" value={rapport?.shift_id ?? vaktId ?? ''} />

      <Seksjon tittel="Om hendelsen">
        <Kort className="space-y-4 p-4 sm:p-5">
          <Felt etikett="Rapporttype" påkrevd>
            <Nedtrekk
              name="type"
              required
              defaultValue={rapport?.report_type ?? 'avvik'}
            >
              {TYPER.map((type) => (
                <option key={type} value={type}>{rapporttypeNavn[type]}</option>
              ))}
            </Nedtrekk>
          </Felt>

          <Felt etikett="Tittel" påkrevd>
            <Tekstfelt
              name="tittel"
              required
              minLength={3}
              defaultValue={rapport?.title ?? ''}
              placeholder="Kort beskrivelse av hendelsen"
            />
          </Felt>

          <Felt etikett="Dato og klokkeslett" påkrevd hjelp="Norsk tid, 24-timers klokke.">
            <Tekstfelt
              name="tidspunkt"
              type="datetime-local"
              required
              defaultValue={toLocalInputValue(rapport?.occurred_at ?? new Date())}
            />
          </Felt>

          <Felt etikett="Objekt">
            <Nedtrekk name="objektId" defaultValue={rapport?.site_id ?? objektId ?? ''}>
              <option value="">Ikke knyttet til et objekt</option>
              {objekter.map((objekt) => (
                <option key={objekt.id} value={objekt.id}>{objekt.name}</option>
              ))}
            </Nedtrekk>
          </Felt>
        </Kort>
      </Seksjon>

      <Seksjon tittel="Beskrivelse">
        <Kort className="space-y-4 p-4 sm:p-5">
          <Felt etikett="Beskrivelse">
            <Tekstområde name="beskrivelse" defaultValue={rapport?.description ?? ''}
              placeholder="Hva gjelder rapporten?" />
          </Felt>
          <Felt etikett="Hendelsesforløp">
            <Tekstområde name="hendelsesforlop" defaultValue={rapport?.sequence_of_events ?? ''}
              placeholder="Beskriv hendelsen kronologisk med klokkeslett." />
          </Felt>
          <Felt etikett="Utførte tiltak">
            <Tekstområde name="tiltak" defaultValue={rapport?.actions_taken ?? ''}
              placeholder="Hva ble gjort?" />
          </Felt>
        </Kort>
      </Seksjon>

      <Seksjon tittel="Varsling og vitner">
        <Kort className="space-y-4 p-4 sm:p-5">
          <Felt etikett="Varslede personer eller nødetater">
            <Tekstfelt name="varslede" defaultValue={rapport?.notified ?? ''}
              placeholder="For eksempel operativ leder, politi, brannvesen" />
          </Felt>
          <Felt etikett="Vitner">
            <Tekstfelt name="vitner" defaultValue={rapport?.witnesses ?? ''}
              placeholder="Navn eller beskrivelse" />
          </Felt>
          <Avkryssing
            name="politiVarslet"
            etikett="Politiet er varslet"
            defaultChecked={rapport?.police_notified ?? false}
          />
        </Kort>
      </Seksjon>

      <Seksjon tittel="Skade og maktbruk">
        <Kort className="space-y-4 p-4 sm:p-5">
          <Avkryssing
            name="personskade"
            etikett="Personskade"
            beskrivelse="Kryss av dersom noen ble skadet."
            checked={personskade}
            onChange={(e) => setPersonskade(e.target.checked)}
          />
          {personskade && (
            <Felt etikett="Beskrivelse av personskade">
              <Tekstområde name="personskadeDetaljer"
                defaultValue={rapport?.personal_injury_details ?? ''} />
            </Felt>
          )}

          <Avkryssing
            name="materiellSkade"
            etikett="Materiell skade"
            checked={materiell}
            onChange={(e) => setMateriell(e.target.checked)}
          />
          {materiell && (
            <Felt etikett="Beskrivelse av materiell skade">
              <Tekstområde name="materiellSkadeDetaljer"
                defaultValue={rapport?.material_damage_details ?? ''} />
            </Felt>
          )}

          <Avkryssing
            name="fysiskMakt"
            etikett="Bruk av fysisk makt"
            beskrivelse="Skal alltid beskrives detaljert."
            checked={makt}
            onChange={(e) => setMakt(e.target.checked)}
          />
          {makt && (
            <Felt
              etikett="Beskrivelse av maktbruken"
              hjelp="Grep, varighet, foranledning og resultat."
            >
              <Tekstområde name="fysiskMaktDetaljer"
                defaultValue={rapport?.physical_force_details ?? ''} />
            </Felt>
          )}
        </Kort>
      </Seksjon>

      {rapport && mappe && (
        <Seksjon tittel="Bildevedlegg" beskrivelse="Bildene lagres privat og hentes med tidsbegrenset lenke.">
          <Kort className="p-4 sm:p-5">
            <Bildeopplasting bøtte="rapport-vedlegg" mappe={`${selskapId}/${rapport.id}`} />
          </Kort>
        </Seksjon>
      )}

      <LagreKnapp ny={ny} />
    </form>
  );
}

/* useFormStatus ma sta i en komponent inne i skjemaet for a fange
   innsendingsstatusen. */
function SendInnKnapp() {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      <Send className="h-5 w-5" strokeWidth={2} />
      {pending ? 'Sender inn …' : 'Send inn rapport'}
    </Knapp>
  );
}

export function SendInnSkjema({ rapportId }: { rapportId: string }) {
  const [tilstand, send] = useActionState<Rapporttilstand, FormData>(sendInnRapport, {});

  return (
    <form action={send} className="space-y-3">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="rapportId" value={rapportId} />
      <SendInnKnapp />
      <p className="text-xs text-tekst-svak">
        Når rapporten er sendt inn, kan du ikke endre innholdet.
      </p>
    </form>
  );
}
