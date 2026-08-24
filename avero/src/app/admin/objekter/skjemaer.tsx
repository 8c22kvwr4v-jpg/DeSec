'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { opprettKunde, opprettObjekt, type Adminstilstand } from '@/server/actions/admin';
import { Beskjed, Knapp } from '@/components/ui';
import { Felt, Nedtrekk, Tekstfelt } from '@/components/skjemafelt';
import type { Customer } from '@/lib/database.types';

function Send({ tekst }: { tekst: string }) {
  const { pending } = useFormStatus();
  return (
    <Knapp type="submit" størrelse="stor" bred disabled={pending}>
      {pending ? 'Lagrer …' : tekst}
    </Knapp>
  );
}

export function NyKundeSkjema() {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(opprettKunde, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <Felt etikett="Kundenavn" påkrevd>
        <Tekstfelt name="navn" required />
      </Felt>
      <div className="grid gap-4 sm:grid-cols-2">
        <Felt etikett="Organisasjonsnummer"><Tekstfelt name="orgnummer" /></Felt>
        <Felt etikett="Kontaktperson"><Tekstfelt name="kontakt" /></Felt>
      </div>
      <Felt etikett="Telefon"><Tekstfelt name="telefon" type="tel" /></Felt>
      <Send tekst="Opprett kunde" />
    </form>
  );
}

export function NyttObjektSkjema({ kunder }: { kunder: Customer[] }) {
  const [tilstand, send] = useActionState<Adminstilstand, FormData>(opprettObjekt, {});
  return (
    <form action={send} className="space-y-4">
      {tilstand.feil && <Beskjed>{tilstand.feil}</Beskjed>}
      {tilstand.melding && <Beskjed tone="positiv">{tilstand.melding}</Beskjed>}
      <Felt etikett="Kunde" påkrevd>
        <Nedtrekk name="kundeId" required defaultValue="">
          <option value="" disabled>Velg kunde</option>
          {kunder.map((kunde) => (
            <option key={kunde.id} value={kunde.id}>{kunde.name}</option>
          ))}
        </Nedtrekk>
      </Felt>
      <div className="grid gap-4 sm:grid-cols-2">
        <Felt etikett="Navn på objektet" påkrevd><Tekstfelt name="navn" required /></Felt>
        <Felt etikett="Objektkode"><Tekstfelt name="kode" placeholder="NKP" /></Felt>
      </div>
      <Felt etikett="Adresse"><Tekstfelt name="adresse" /></Felt>
      <div className="grid gap-4 sm:grid-cols-2">
        <Felt etikett="Postnummer"><Tekstfelt name="postnummer" inputMode="numeric" /></Felt>
        <Felt etikett="Poststed"><Tekstfelt name="poststed" /></Felt>
      </div>
      <Felt etikett="Oppmøtested"><Tekstfelt name="oppmote" /></Felt>
      <Send tekst="Opprett objekt" />
    </form>
  );
}
