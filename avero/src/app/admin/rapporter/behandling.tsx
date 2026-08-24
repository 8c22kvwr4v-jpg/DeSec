'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { behandleRapport, type Adminstilstand } from '@/server/actions/admin';
import { Beskjed, Knapp } from '@/components/ui';
import { Felt, Nedtrekk, Tekstområde } from '@/components/skjemafelt';
import type { Rapportstatus } from '@/lib/database.types';

function Send() {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      {pending ? 'Lagrer …' : 'Lagre behandling'}
    </Knapp>
  );
}

export function BehandlingSkjema({
  rapportId, status, notat,
}: { rapportId: string; status: Rapportstatus; notat: string | null }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(behandleRapport, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="rapportId" value={rapportId} />
      <Felt etikett="Status">
        <Nedtrekk name="status" defaultValue={status === 'utkast' ? 'innsendt' : status}>
          <option value="innsendt">Innsendt</option>
          <option value="under_behandling">Under behandling</option>
          <option value="ferdigbehandlet">Ferdigbehandlet</option>
        </Nedtrekk>
      </Felt>
      <Felt etikett="Behandlingsnotat" hjelp="Synlig for rapportøren.">
        <Tekstområde name="notat" defaultValue={notat ?? ''} />
      </Felt>
      <Send />
    </form>
  );
}
