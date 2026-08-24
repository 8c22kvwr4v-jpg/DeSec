import { krevBruker } from '@/lib/auth';
import { Skall } from '@/components/skall';
import { ansattMeny } from '@/components/navigasjon';
import { antallUleste } from '@/server/data/varsler';

/** Rammen rundt ansattflaten. Krever innlogget bruker. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const bruker = await krevBruker();
  const uleste = await antallUleste(bruker.id);

  return (
    <Skall
      bruker={bruker}
      meny={ansattMeny}
      merSti="/mer"
      varselSti="/varsler"
      uleste={uleste}
    >
      {children}
    </Skall>
  );
}
