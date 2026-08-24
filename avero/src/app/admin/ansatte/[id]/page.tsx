import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentAnsatt } from '@/server/data/admin';
import { Etikettverdi, Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import {
  AktiverSkjema, NyttKursSkjema, ObjekttilgangSkjema, RolleSkjema,
} from '../skjemaer';
import { formatDate } from '@/lib/dates';
import { kursstatus, kvalifikasjonstypeNavn, rolleNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Ansatt' };

export default async function AnsattSide({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bruker = await krevRolle('administrator', 'operativ_leder');
  const data = await hentAnsatt(id);
  if (!data) notFound();

  const { profil, tilganger, kurs, objekter, avdelinger } = data;
  const erAdmin = bruker.profil.role === 'administrator';

  return (
    <div className="space-y-6">
      <Sidehode
        tilbake={{ href: '/admin/ansatte', tekst: 'Ansatte' }}
        tittel={profil.full_name}
        undertittel={
          <span className="flex flex-wrap items-center gap-2">
            <Merkelapp tone={profil.role === 'ansatt' ? 'nøytral' : 'aksent'}>
              {rolleNavn[profil.role]}
            </Merkelapp>
            {!profil.is_active && <Merkelapp tone="kritisk">Deaktivert</Merkelapp>}
          </span>
        }
      />

      <Kort className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Etikettverdi etikett="E-post">{profil.email}</Etikettverdi>
          <Etikettverdi etikett="Telefon">{profil.phone ?? '–'}</Etikettverdi>
          <Etikettverdi etikett="Stilling">{profil.job_title ?? '–'}</Etikettverdi>
          <Etikettverdi etikett="Ansattnummer">{profil.employee_number ?? '–'}</Etikettverdi>
          <Etikettverdi etikett="Avdeling">
            {avdelinger.find((a) => a.id === profil.department_id)?.name ?? '–'}
          </Etikettverdi>
          <Etikettverdi etikett="Opprettet">{formatDate(profil.created_at)}</Etikettverdi>
        </dl>
      </Kort>

      {erAdmin && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Seksjon tittel="Rolle og avdeling">
            <Kort className="p-4 sm:p-5">
              <RolleSkjema
                profilId={profil.id}
                rolle={profil.role}
                avdelingId={profil.department_id}
                avdelinger={avdelinger}
              />
            </Kort>
          </Seksjon>

          <Seksjon tittel="Tilgang til systemet">
            <Kort className="p-4 sm:p-5">
              <AktiverSkjema profilId={profil.id} aktiv={profil.is_active} />
            </Kort>
          </Seksjon>
        </div>
      )}

      {erAdmin && (
        <Seksjon
          tittel="Objekttilgang"
          beskrivelse="Bestemmer hvilke objekter den ansatte kan se, og hvilke objektinstrukser som blir synlige."
        >
          <Kort className="p-4 sm:p-5">
            <ObjekttilgangSkjema
              profilId={profil.id}
              objekter={objekter}
              tilganger={tilganger.map((t) => t.site_id)}
            />
          </Kort>
        </Seksjon>
      )}

      <Seksjon tittel="Kurs og godkjenninger">
        {kurs.length === 0 ? (
          <TomTilstand
            ikon={<GraduationCap className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen kurs registrert"
          />
        ) : (
          <ul className="space-y-2">
            {kurs.map((k) => {
              const status = kursstatus(k.expires_on);
              return (
                <li key={k.id}>
                  <Kort className="flex min-h-14 items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-tekst">{k.name}</span>
                      <span className="block text-xs text-tekst-dempet">
                        {kvalifikasjonstypeNavn[k.kind]}
                        {k.expires_on && ` · utløper ${formatDate(k.expires_on)}`}
                      </span>
                    </span>
                    <Merkelapp tone={status.tone}>{status.tekst}</Merkelapp>
                  </Kort>
                </li>
              );
            })}
          </ul>
        )}

        {erAdmin && (
          <Kort className="mt-3 p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-semibold text-tekst">Registrer nytt kurs</h3>
            <NyttKursSkjema profilId={profil.id} />
          </Kort>
        )}
      </Seksjon>
    </div>
  );
}
