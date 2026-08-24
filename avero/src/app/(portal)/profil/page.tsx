import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { Etikettverdi, Kort, Merkelapp, Seksjon } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import { ProfilSkjema } from './skjema';
import { rolleNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Min profil' };

export default async function ProfilSide() {
  const bruker = await krevBruker();
  const { profil } = bruker;

  return (
    <div className="space-y-6">
      <Sidehode
        tittel="Min profil"
        undertittel={<Merkelapp tone="aktiv">{rolleNavn[profil.role]}</Merkelapp>}
      />

      <Kort className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Etikettverdi etikett="Navn">{profil.full_name}</Etikettverdi>
          <Etikettverdi etikett="Stilling">{profil.job_title ?? '–'}</Etikettverdi>
          <Etikettverdi etikett="Ansattnummer">{profil.employee_number ?? '–'}</Etikettverdi>
          <Etikettverdi etikett="E-post">{profil.email}</Etikettverdi>
          <Etikettverdi etikett="Selskap">{bruker.selskap.name}</Etikettverdi>
          <Etikettverdi etikett="Rolle">{rolleNavn[profil.role]}</Etikettverdi>
        </dl>
      </Kort>

      <Seksjon tittel="Kontaktopplysninger">
        <Kort className="p-5">
          <ProfilSkjema telefon={profil.phone} />
        </Kort>
      </Seksjon>

      <Kort className="p-4">
        <p className="flex items-start gap-3 text-sm text-tekst-dempet">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-aksent-lys" strokeWidth={1.8} />
          Rolle, avdeling og tilganger styres av administrator og kan ikke endres av deg selv.
        </p>
      </Kort>
    </div>
  );
}
