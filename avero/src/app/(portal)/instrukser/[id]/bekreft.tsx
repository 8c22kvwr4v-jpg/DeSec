'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { bekreftLest, type Handlingstilstand } from '@/server/actions/instrukser';
import { Beskjed, Knapp } from '@/components/ui';

function Send() {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
      {pending ? 'Registrerer …' : 'Jeg har lest og forstått'}
    </Knapp>
  );
}

export function BekreftLestSkjema({ instruksId }: { instruksId: string }) {
  const [tilstand, send] = useActionState<Handlingstilstand, FormData>(bekreftLest, {});
  return (
    <form action={send} className="space-y-3">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="instruksId" value={instruksId} />
      <Send />
    </form>
  );
}
