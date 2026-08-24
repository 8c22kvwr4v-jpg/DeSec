'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Bell } from 'lucide-react';
import { sendVarsel, type Adminstilstand } from '@/server/actions/admin';
import { Beskjed, Knapp } from '@/components/ui';
import { Felt, Tekstfelt, Tekstområde } from '@/components/skjemafelt';
import type { Profile } from '@/lib/database.types';

function Send() {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      <Bell className="h-5 w-5" strokeWidth={2} />
      {pending ? 'Sender …' : 'Send varsling'}
    </Knapp>
  );
}

export function VarselSkjema({ ansatte }: { ansatte: Profile[] }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(sendVarsel, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}

      <Felt etikett="Tittel" påkrevd>
        <Tekstfelt name="tittel" required />
      </Felt>
      <Felt etikett="Melding">
        <Tekstområde name="tekst" />
      </Felt>
      <Felt etikett="Mottakere" påkrevd hjelp="Hold inne Ctrl eller Cmd for å velge flere.">
        <select
          name="mottakerId"
          multiple
          required
          size={Math.min(8, Math.max(4, ansatte.length))}
          className="w-full rounded-xl bg-marine-900 px-3 py-2 text-base text-tekst ring-1 ring-inset ring-linje focus:ring-2 focus:ring-aksent focus:outline-none"
        >
          {ansatte.map((ansatt) => (
            <option key={ansatt.id} value={ansatt.id}>{ansatt.full_name}</option>
          ))}
        </select>
      </Felt>
      <Send />
    </form>
  );
}
