'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Power, ShieldCheck, UserPlus } from 'lucide-react';
import {
  endreObjekttilgang, opprettAnsatt, opprettKurs, settAktiv, settRolle,
  type Adminstilstand,
} from '@/server/actions/admin';
import { Beskjed, Knapp, Merkelapp } from '@/components/ui';
import { Felt, Nedtrekk, Tekstfelt } from '@/components/skjemafelt';
import { rolleNavn } from '@/lib/etiketter';
import type { Department, Rolle, Site } from '@/lib/database.types';

const ROLLER: Rolle[] = ['ansatt', 'operativ_leder', 'administrator'];

function Send({ tekst, venter, variant = 'primær' }: {
  tekst: string; venter: string; variant?: 'primær' | 'sekundær' | 'fare';
}) {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" variant={variant} størrelse="stor" bred disabled={pending}>
      {pending ? venter : tekst}
    </Knapp>
  );
}

export function NyAnsattSkjema({ avdelinger }: { avdelinger: Department[] }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(opprettAnsatt, {});

  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Felt etikett="Fornavn" påkrevd>
          <Tekstfelt name="fornavn" required autoComplete="off" />
        </Felt>
        <Felt etikett="Etternavn" påkrevd>
          <Tekstfelt name="etternavn" required autoComplete="off" />
        </Felt>
      </div>

      <Felt etikett="E-postadresse" påkrevd hjelp="Brukes til pålogging.">
        <Tekstfelt name="epost" type="email" required autoComplete="off" autoCapitalize="none" />
      </Felt>

      <div className="grid gap-4 sm:grid-cols-2">
        <Felt etikett="Telefon">
          <Tekstfelt name="telefon" type="tel" />
        </Felt>
        <Felt etikett="Ansattnummer">
          <Tekstfelt name="ansattnummer" placeholder="AV-018" />
        </Felt>
      </div>

      <Felt etikett="Stilling">
        <Tekstfelt name="stilling" placeholder="Vekter" />
      </Felt>

      <div className="grid gap-4 sm:grid-cols-2">
        <Felt etikett="Rolle" påkrevd>
          <Nedtrekk name="rolle" defaultValue="ansatt" required>
            {ROLLER.map((rolle) => (
              <option key={rolle} value={rolle}>{rolleNavn[rolle]}</option>
            ))}
          </Nedtrekk>
        </Felt>
        <Felt etikett="Avdeling">
          <Nedtrekk name="avdelingId" defaultValue="">
            <option value="">Ingen avdeling</option>
            {avdelinger.map((avdeling) => (
              <option key={avdeling.id} value={avdeling.id}>{avdeling.name}</option>
            ))}
          </Nedtrekk>
        </Felt>
      </div>

      <Felt
        etikett="Midlertidig passord"
        påkrevd
        hjelp="Minst 12 tegn. Den ansatte bør bytte passord ved første pålogging."
      >
        <Tekstfelt name="passord" type="text" required minLength={12} autoComplete="off" />
      </Felt>

      <Send tekst="Opprett bruker" venter="Oppretter …" />
    </form>
  );
}

export function RolleSkjema({
  profilId, rolle, avdelingId, avdelinger,
}: {
  profilId: string; rolle: Rolle; avdelingId: string | null; avdelinger: Department[];
}) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(settRolle, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="profilId" value={profilId} />
      <Felt etikett="Rolle">
        <Nedtrekk name="rolle" defaultValue={rolle}>
          {ROLLER.map((r) => <option key={r} value={r}>{rolleNavn[r]}</option>)}
        </Nedtrekk>
      </Felt>
      <Felt etikett="Avdeling">
        <Nedtrekk name="avdelingId" defaultValue={avdelingId ?? ''}>
          <option value="">Ingen avdeling</option>
          {avdelinger.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Nedtrekk>
      </Felt>
      <Send tekst="Lagre" venter="Lagrer …" />
    </form>
  );
}

export function AktiverSkjema({
  profilId, aktiv,
}: { profilId: string; aktiv: boolean }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(settAktiv, {});
  return (
    <form action={send} className="space-y-3">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="profilId" value={profilId} />
      <input type="hidden" name="aktiv" value={aktiv ? 'false' : 'true'} />
      <Send
        tekst={aktiv ? 'Deaktiver bruker' : 'Aktiver bruker'}
        venter="Lagrer …"
        variant={aktiv ? 'fare' : 'primær'}
      />
      <p className="text-xs text-tekst-svak">
        {aktiv
          ? 'Deaktivering sperrer pålogging og fjerner all tilgang umiddelbart.'
          : 'Brukeren får tilbake tilgangen sin.'}
      </p>
    </form>
  );
}

export function ObjekttilgangSkjema({
  profilId, objekter, tilganger,
}: { profilId: string; objekter: Site[]; tilganger: string[] }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(endreObjekttilgang, {});
  const har = new Set(tilganger);

  return (
    <div className="space-y-3">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <ul className="space-y-2">
        {objekter.map((objekt) => (
          <li
            key={objekt.id}
            className="flex min-h-14 items-center gap-3 rounded-xl bg-marine-900 px-4 ring-1 ring-linje"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-tekst">{objekt.name}</span>
              {objekt.city && (
                <span className="block text-xs text-tekst-svak">{objekt.city}</span>
              )}
            </span>
            {har.has(objekt.id) && <Merkelapp tone="positiv">Tilgang</Merkelapp>}
            <form action={send}>
              <input type="hidden" name="profilId" value={profilId} />
              <input type="hidden" name="objektId" value={objekt.id} />
              <input type="hidden" name="gi" value={har.has(objekt.id) ? 'false' : 'true'} />
              <button
                type="submit"
                className={`min-h-10 rounded-lg px-3 text-xs font-semibold ring-1 ring-inset ${
                  har.has(objekt.id)
                    ? 'text-kritisk ring-kritisk/40 hover:bg-kritisk/15'
                    : 'text-aksent-lys ring-aksent/40 hover:bg-aksent/15'
                }`}
              >
                {har.has(objekt.id) ? 'Fjern' : 'Gi tilgang'}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NyttKursSkjema({ profilId }: { profilId: string }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(opprettKurs, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="profilId" value={profilId} />
      <Felt etikett="Navn" påkrevd>
        <Tekstfelt name="navn" required placeholder="Vekterkurs trinn 2" />
      </Felt>
      <div className="grid gap-4 sm:grid-cols-2">
        <Felt etikett="Type">
          <Nedtrekk name="type" defaultValue="kurs">
            <option value="kurs">Kurs</option>
            <option value="godkjenning">Godkjenning</option>
            <option value="dokument">Dokument</option>
          </Nedtrekk>
        </Felt>
        <Felt etikett="Utsteder">
          <Tekstfelt name="utsteder" />
        </Felt>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Felt etikett="Utstedt">
          <Tekstfelt name="utstedt" type="date" />
        </Felt>
        <Felt etikett="Utløper">
          <Tekstfelt name="utloper" type="date" />
        </Felt>
      </div>
      <Send tekst="Registrer" venter="Lagrer …" variant="sekundær" />
    </form>
  );
}

export const ikoner = { UserPlus, Power, ShieldCheck };
