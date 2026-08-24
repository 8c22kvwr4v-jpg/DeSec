import { redirect } from 'next/navigation';
import { hentBruker, startsideFor } from '@/lib/auth';

/** Sender brukeren videre til riktig startside ut fra rollen. */
export default async function StartSide() {
  const bruker = await hentBruker();
  if (!bruker) redirect('/logg-inn');
  redirect(startsideFor(bruker.profil.role));
}
