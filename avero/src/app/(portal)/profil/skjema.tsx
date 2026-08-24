'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { oppdaterProfil, type Handlingstilstand } from '@/server/actions/diverse';
import { Beskjed, Knapp } from '@/components/ui';
import { Felt, Tekstfelt } from '@/components/skjemafelt';

function Lagre() {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      {pending ? 'Lagrer …' : 'Lagre'}
    </Knapp>
  );
}

export function ProfilSkjema({ telefon }: { telefon: string | null }) {
  const [tilstand, send] = useActionState<Handlingstilstand, FormData>(oppdaterProfil, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <Felt etikett="Telefonnummer" hjelp="Brukes av operativ leder ved behov.">
        <Tekstfelt name="telefon" type="tel" defaultValue={telefon ?? ''} />
      </Felt>
      <Lagre />
    </form>
  );
}
