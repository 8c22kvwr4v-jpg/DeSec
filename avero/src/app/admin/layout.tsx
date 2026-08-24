import { krevRolle } from '@/lib/auth';
import { Skall } from '@/components/skall';
import { adminMeny } from '@/components/navigasjon';
import { antallUleste } from '@/server/data/varsler';

/**
 * Administrasjonspanelet.
 *
 * Vanlige ansatte slipper ikke inn. Operativ leder far et redusert
 * panel, og ser uansett bare data innenfor sitt ansvarsomrade fordi
 * databasen filtrerer alle spørringer.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const bruker = await krevRolle('administrator', 'operativ_leder');
  const uleste = await antallUleste(bruker.id);

  const kunAdministrator = [
    '/admin/instrukser', '/admin/varsler', '/admin/revisjonslogg', '/admin/eksport',
  ];
  const meny = bruker.profil.role === 'administrator'
    ? adminMeny
    : adminMeny.filter((punkt) => !kunAdministrator.includes(punkt.sti));

  return (
    <Skall
      bruker={bruker}
      meny={meny}
      merSti="/admin/mer"
      varselSti="/varsler"
      uleste={uleste}
    >
      {children}
    </Skall>
  );
}
