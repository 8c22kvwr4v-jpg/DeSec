import type { Metadata } from 'next';
import { krevRolle } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Kort } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import { NyAnsattSkjema } from '../skjemaer';

export const metadata: Metadata = { title: 'Ny bruker' };

export default async function NyAnsattSide() {
  await krevRolle('administrator');
  const klient = await createClient();
  const { data: avdelinger } = await klient
    .from('departments').select('*').is('deleted_at', null).order('name');

  return (
    <div className="space-y-5">
      <Sidehode
        tilbake={{ href: '/admin/ansatte', tekst: 'Ansatte' }}
        tittel="Ny bruker"
        undertittel="Brukeren får tilgang med e-post og midlertidig passord."
      />
      <Kort className="p-4 sm:p-6">
        <NyAnsattSkjema avdelinger={avdelinger ?? []} />
      </Kort>
    </div>
  );
}
