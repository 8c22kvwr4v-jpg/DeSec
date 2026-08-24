import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentKunderOgObjekter } from '@/server/data/admin';
import { Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { NyKundeSkjema, NyttObjektSkjema } from './skjemaer';
import { adresselinje } from '@/server/data/felles';

export const metadata: Metadata = { title: 'Kunder og objekter' };

export default async function ObjekterSide() {
  const bruker = await krevRolle('administrator', 'operativ_leder');
  const { kunder, objekter } = await hentKunderOgObjekter();
  const erAdmin = bruker.profil.role === 'administrator';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Kunder og objekter</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          {kunder.length} kunder · {objekter.length} objekter
        </p>
      </header>

      <Seksjon tittel="Objekter">
        {objekter.length === 0 ? (
          <TomTilstand
            ikon={<Building2 className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen objekter"
          />
        ) : (
          <ul className="space-y-2">
            {objekter.map((objekt) => (
              <li key={objekt.id}>
                <Kort className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-tekst">{objekt.name}</p>
                      <p className="mt-0.5 truncate text-xs text-tekst-dempet">
                        {kunder.find((k) => k.id === objekt.customer_id)?.name ?? 'Ukjent kunde'}
                      </p>
                      <p className="mt-1 text-xs text-tekst-svak">
                        {adresselinje(objekt) ?? 'Ingen adresse registrert'}
                      </p>
                    </div>
                    {objekt.code && <Merkelapp>{objekt.code}</Merkelapp>}
                  </div>
                </Kort>
              </li>
            ))}
          </ul>
        )}
      </Seksjon>

      <Seksjon tittel="Kunder">
        <ul className="space-y-2">
          {kunder.map((kunde) => (
            <li key={kunde.id}>
              <Kort className="flex min-h-14 items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-tekst">{kunde.name}</span>
                  <span className="block truncate text-xs text-tekst-dempet">
                    {kunde.contact_name ?? 'Ingen kontaktperson'}
                    {kunde.contact_phone && ` · ${kunde.contact_phone}`}
                  </span>
                </span>
                <Merkelapp>
                  {objekter.filter((o) => o.customer_id === kunde.id).length} objekt
                </Merkelapp>
              </Kort>
            </li>
          ))}
        </ul>
      </Seksjon>

      {erAdmin && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Seksjon tittel="Ny kunde">
            <Kort className="p-4 sm:p-5"><NyKundeSkjema /></Kort>
          </Seksjon>
          <Seksjon tittel="Nytt objekt">
            <Kort className="p-4 sm:p-5"><NyttObjektSkjema kunder={kunder} /></Kort>
          </Seksjon>
        </div>
      )}
    </div>
  );
}
