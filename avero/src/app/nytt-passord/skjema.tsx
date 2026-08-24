'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { settNyttPassord, type Skjematilstand } from '@/server/actions/auth';
import { Beskjed, Knapp, Kort } from '@/components/ui';
import { Felt, Tekstfelt } from '@/components/skjemafelt';

function SendKnapp() {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      {pending ? 'Lagrer …' : 'Lagre passord'}
    </Knapp>
  );
}

export function NyttPassordSkjema() {
  const [tilstand, send] = useActionState<Skjematilstand, FormData>(settNyttPassord, {});
  return (
    <Kort className="p-5 sm:p-6">
      <form action={send} className="space-y-4">
        {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
        <Felt etikett="Nytt passord" påkrevd>
          <Tekstfelt name="passord" type="password" autoComplete="new-password" required minLength={12} />
        </Felt>
        <Felt etikett="Gjenta passord" påkrevd>
          <Tekstfelt name="gjenta" type="password" autoComplete="new-password" required minLength={12} />
        </Felt>
        <SendKnapp />
      </form>
    </Kort>
  );
}
