'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { LogIn } from 'lucide-react';
import { loggInn, type Skjematilstand } from '@/server/actions/auth';
import { Beskjed, Kort, Knapp } from '@/components/ui';
import { Felt, Tekstfelt } from '@/components/skjemafelt';

function SendKnapp() {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      <LogIn className="h-5 w-5" strokeWidth={2} />
      {pending ? 'Logger inn …' : 'Logg inn'}
    </Knapp>
  );
}

export function PaloggingSkjema({
  retur, startfeil,
}: { retur?: string; startfeil?: string }) {
  const [tilstand, send] = useActionState<Skjematilstand, FormData>(
    loggInn, startfeil ? { feil: startfeil } : {},
  );

  return (
    <Kort className="p-5 sm:p-6">
      <form action={send} className="space-y-4">
        {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}

        <input type="hidden" name="retur" value={retur ?? ''} />

        <Felt etikett="E-postadresse" påkrevd>
          <Tekstfelt
            name="epost"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            required
            placeholder="fornavn.etternavn@avero.no"
          />
        </Felt>

        <Felt etikett="Passord" påkrevd>
          <Tekstfelt
            name="passord"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Felt>

        <SendKnapp />
      </form>
    </Kort>
  );
}
