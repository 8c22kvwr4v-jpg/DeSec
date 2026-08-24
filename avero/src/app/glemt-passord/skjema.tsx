'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { glemtPassord, type Skjematilstand } from '@/server/actions/auth';
import { Beskjed, Knapp, Kort } from '@/components/ui';
import { Felt, Tekstfelt } from '@/components/skjemafelt';

function SendKnapp() {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      {pending ? 'Sender …' : 'Send lenke'}
    </Knapp>
  );
}

export function GlemtPassordSkjema() {
  const [tilstand, send] = useActionState<Skjematilstand, FormData>(glemtPassord, {});
  return (
    <Kort className="p-5 sm:p-6">
      <form action={send} className="space-y-4">
        {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
        {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
        <Felt etikett="E-postadresse" påkrevd>
          <Tekstfelt name="epost" type="email" autoComplete="username" inputMode="email"
            autoCapitalize="none" required />
        </Felt>
        <SendKnapp />
      </form>
    </Kort>
  );
}
