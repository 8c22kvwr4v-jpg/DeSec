'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Send } from 'lucide-react';
import { sokLedigVakt, type Handlingstilstand } from '@/server/actions/diverse';
import { Beskjed, Knapp } from '@/components/ui';

function Send1() {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" variant="sekundær" bred disabled={pending}>
      <Send className="h-4 w-4" strokeWidth={2} />
      {pending ? 'Sender …' : 'Søk på vakten'}
    </Knapp>
  );
}

export function SoknadSkjema({ vaktId }: { vaktId: string }) {
  const [tilstand, send] = useActionState<Handlingstilstand, FormData>(sokLedigVakt, {});
  return (
    <form action={send} className="mt-3 space-y-2">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <input type="hidden" name="vaktId" value={vaktId} />
      <Send1 />
    </form>
  );
}
