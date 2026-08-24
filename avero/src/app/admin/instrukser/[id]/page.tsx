import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, Users } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import {
  hentAnsatte, hentInstrukserAdmin, hentKunderOgObjekter, hentVakterIPeriode,
} from '@/server/data/admin';
import { createClient } from '@/lib/supabase/server';
import { Etikettverdi, Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import { TildelInstruksSkjema, TrekkTilbakeSkjema } from '../skjemaer';
import { addDays, formatDate, formatDateTime } from '@/lib/dates';

export const metadata: Metadata = { title: 'Instruks' };

export default async function AdminInstruksSide({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await krevRolle('administrator');

  const alle = await hentInstrukserAdmin();
  const valgt = alle.find((i) => i.instruks.id === id);
  if (!valgt) notFound();

  const klient = await createClient();
  const [ansatte, { objekter }, vakter, { data: avdelinger }] = await Promise.all([
    hentAnsatte(),
    hentKunderOgObjekter(),
    hentVakterIPeriode(new Date(), addDays(new Date(), 21)),
    klient.from('departments').select('*').is('deleted_at', null).order('name'),
  ]);

  const { instruks, objekt, tildelinger, bekreftelser } = valgt;
  const gjeldendeBekreftelser = bekreftelser.filter((b) => b.version === instruks.version);
  const utdaterte = bekreftelser.filter((b) => b.version < instruks.version);

  return (
    <div className="space-y-6">
      <Sidehode
        tilbake={{ href: '/admin/instrukser', tekst: 'Instrukser' }}
        tittel={instruks.title}
        undertittel={
          <span className="flex flex-wrap items-center gap-2">
            <Merkelapp>Versjon {instruks.version}</Merkelapp>
            {instruks.requires_acknowledgement && (
              <Merkelapp tone="aksent">Krever lesebekreftelse</Merkelapp>
            )}
          </span>
        }
      />

      <Kort className="p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Etikettverdi etikett="Objekt">{objekt?.name ?? 'Ikke knyttet til objekt'}</Etikettverdi>
          <Etikettverdi etikett="Gyldig fra">{formatDate(instruks.valid_from)}</Etikettverdi>
          <Etikettverdi etikett="Gyldig til">
            {instruks.valid_to ? formatDate(instruks.valid_to) : 'Inntil videre'}
          </Etikettverdi>
          <Etikettverdi etikett="Sist endret">{formatDate(instruks.updated_at)}</Etikettverdi>
        </dl>
        {instruks.summary && (
          <p className="mt-4 text-sm text-tekst-dempet">{instruks.summary}</p>
        )}
      </Kort>

      <Seksjon
        tittel="Hvem har tilgang"
        beskrivelse="Kun mottakerne under kan se instruksen."
      >
        {tildelinger.length === 0 ? (
          <TomTilstand
            ikon={<Users className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen har tilgang ennå"
            tekst="Instruksen er usynlig for alle ansatte til den blir tildelt."
          />
        ) : (
          <ul className="space-y-2">
            {tildelinger.map((tildeling) => (
              <li key={tildeling.id}>
                <Kort className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-tekst">
                      {tildeling.mottaker}
                    </span>
                    <span className="block text-xs text-tekst-dempet">
                      Fra {formatDate(tildeling.valid_from)}
                      {tildeling.valid_to && ` til ${formatDate(tildeling.valid_to)}`}
                      {tildeling.requires_acknowledgement && ' · krever bekreftelse'}
                    </span>
                  </span>
                  <TrekkTilbakeSkjema tildelingId={tildeling.id} instruksId={instruks.id} />
                </Kort>
              </li>
            ))}
          </ul>
        )}
      </Seksjon>

      <Seksjon tittel="Tildel tilgang">
        <Kort className="p-4 sm:p-5">
          <TildelInstruksSkjema
            instruksId={instruks.id}
            ansatte={ansatte.filter((a) => a.is_active)}
            objekter={objekter}
            avdelinger={avdelinger ?? []}
            vakter={vakter.map(({ vakt, objekt: o }) => ({ vakt, objekt: o }))}
          />
        </Kort>
      </Seksjon>

      <Seksjon
        tittel="Lesebekreftelser"
        beskrivelse={`${gjeldendeBekreftelser.length} har bekreftet gjeldende versjon.`}
      >
        {bekreftelser.length === 0 ? (
          <TomTilstand
            ikon={<CheckCircle2 className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen har bekreftet ennå"
          />
        ) : (
          <ul className="space-y-2">
            {[...gjeldendeBekreftelser, ...utdaterte].map((bekreftelse) => (
              <li key={bekreftelse.id}>
                <Kort className="flex min-h-14 items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-tekst">{bekreftelse.navn}</span>
                    <span className="block text-xs text-tekst-dempet">
                      {formatDateTime(bekreftelse.acknowledged_at)} · versjon {bekreftelse.version}
                    </span>
                  </span>
                  <Merkelapp
                    tone={bekreftelse.version === instruks.version ? 'positiv' : 'advarsel'}
                  >
                    {bekreftelse.version === instruks.version ? 'Gjeldende' : 'Utdatert'}
                  </Merkelapp>
                </Kort>
              </li>
            ))}
          </ul>
        )}
      </Seksjon>
    </div>
  );
}
