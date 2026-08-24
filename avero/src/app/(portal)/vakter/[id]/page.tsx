import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Building2, ChevronRight, ClipboardList, FilePlus2, MapPin, NotebookPen, Phone,
  ShieldAlert, StickyNote, User,
} from 'lucide-react';
import { krevBruker } from '@/lib/auth';
import { hentSynligeKontakter, hentVakt } from '@/server/data/vakter';
import { hentInstrukserForVakt } from '@/server/data/instrukser';
import { adresselinje, kartlenke } from '@/server/data/felles';
import { Kort, Lenkeknapp, Merkelapp, Seksjon, Etikettverdi, TomTilstand } from '@/components/ui';
import { Sidehode } from '@/components/skall';
import {
  crossesMidnight, formatDateLong, formatDuration, formatShiftTime, isOngoing, relativeTime,
} from '@/lib/dates';
import { vaktstatusNavn, vaktstatusTone, vakttypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Vaktdetaljer' };

export default async function VaktdetaljSide({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bruker = await krevBruker();
  const visning = await hentVakt(id);

  // Databasen returnerer ingen rad nar vakten ikke tilhorer brukeren.
  // Det gjelder ogsa om noen skriver inn en id direkte i adressefeltet.
  if (!visning) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-kritisk" strokeWidth={1.6} />
        <h1 className="text-xl font-semibold">Ingen tilgang</h1>
        <p className="mt-2 text-sm text-tekst-dempet">
          Denne vakten tilhører ikke deg, eller den finnes ikke. Har du fatt vakten
          tildelt nylig, prøv a laste siden pa nytt.
        </p>
        <Lenkeknapp href="/vakter" className="mt-6" størrelse="stor">
          Til mine vakter
        </Lenkeknapp>
      </div>
    );
  }

  const { vakt, objekt, kunde } = visning;
  const [kontakter, instrukser] = await Promise.all([
    objekt ? hentSynligeKontakter(objekt.id) : Promise.resolve([]),
    hentInstrukserForVakt(bruker.id, vakt.id, objekt?.id ?? null),
  ]);

  const pagar = isOngoing(vakt.starts_at, vakt.ends_at);
  const adresse = adresselinje(objekt);
  const kart = kartlenke(objekt);
  const oppmøte = vakt.meeting_point ?? objekt?.meeting_point ?? null;

  return (
    <div className="space-y-6">
      <Sidehode
        tilbake={{ href: '/vakter', tekst: 'Mine vakter' }}
        tittel={objekt?.name ?? 'Vakt'}
        undertittel={
          <span className="flex flex-wrap items-center gap-2">
            <Merkelapp tone={pagar ? 'aktiv' : vaktstatusTone[vakt.status]}>
              {pagar ? 'Pågår nå' : vaktstatusNavn[vakt.status]}
            </Merkelapp>
            <Merkelapp>{vakttypeNavn[vakt.shift_type]}</Merkelapp>
          </span>
        }
      />

      <Kort className="p-5">
        <p className="text-sm text-tekst-dempet">{formatDateLong(vakt.starts_at)}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-tekst">
          {formatShiftTime(vakt.starts_at, vakt.ends_at)}
        </p>
        <p className="mt-1 text-sm text-tekst-dempet">
          {formatDuration(vakt.starts_at, vakt.ends_at)}
          {crossesMidnight(vakt.starts_at, vakt.ends_at) && ' · går over midnatt'}
          {!pagar && ` · starter ${relativeTime(vakt.starts_at)}`}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Lenkeknapp href={`/vakter/${vakt.id}/journal`} størrelse="stor" bred>
            <NotebookPen className="h-5 w-5" strokeWidth={2} />
            Vaktjournal
          </Lenkeknapp>
          <Lenkeknapp
            href={`/rapporter/ny?vakt=${vakt.id}${objekt ? `&objekt=${objekt.id}` : ''}`}
            variant="sekundær"
            størrelse="stor"
            bred
          >
            <FilePlus2 className="h-5 w-5" strokeWidth={2} />
            Ny rapport
          </Lenkeknapp>
        </div>
      </Kort>

      <Seksjon tittel="Objekt og oppmøte">
        <Kort className="p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Etikettverdi etikett="Objekt">
              <span className="flex items-start gap-2">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                {objekt?.name ?? 'Ikke tilgjengelig'}
              </span>
            </Etikettverdi>
            {kunde && <Etikettverdi etikett="Kunde">{kunde.name}</Etikettverdi>}
            <Etikettverdi etikett="Oppmøtested">{oppmøte ?? 'Ikke oppgitt'}</Etikettverdi>
            <Etikettverdi etikett="Adresse">
              <span className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                {adresse ?? 'Ikke oppgitt'}
              </span>
            </Etikettverdi>
          </dl>

          {kart && (
            <a
              href={kart}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 flex min-h-14 items-center justify-center gap-2 rounded-xl bg-marine-700 text-sm font-semibold text-tekst ring-1 ring-linje hover:bg-marine-600"
            >
              <MapPin className="h-5 w-5" strokeWidth={2} />
              Åpne adressen i kart
            </a>
          )}
        </Kort>
      </Seksjon>

      {vakt.notes && (
        <Seksjon tittel="Merknader">
          <Kort className="p-5">
            <p className="flex gap-3 text-sm leading-relaxed text-tekst">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-tekst-svak" strokeWidth={1.8} />
              <span className="whitespace-pre-line">{vakt.notes}</span>
            </p>
          </Kort>
        </Seksjon>
      )}

      <Seksjon
        tittel="Instrukser for denne vakten"
        beskrivelse="Kun instrukser du har fått tildelt."
      >
        {instrukser.length === 0 ? (
          <TomTilstand
            ikon={<ClipboardList className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen instrukser tildelt"
            tekst="Administrator har ikke tildelt instrukser for denne vakten."
          />
        ) : (
          <ul className="space-y-2">
            {instrukser.map(({ instruks, mangler }) => (
              <li key={instruks.id}>
                <Link
                  href={`/instrukser/${instruks.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/80 px-4 py-3 ring-1 ring-linje/70 hover:bg-marine-800"
                >
                  <ClipboardList className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-tekst">
                      {instruks.title}
                    </span>
                    <span className="block text-xs text-tekst-dempet">
                      Versjon {instruks.version}
                    </span>
                  </span>
                  {mangler && <Merkelapp tone="advarsel">Må leses</Merkelapp>}
                  <ChevronRight className="h-5 w-5 shrink-0 text-tekst-svak" strokeWidth={1.8} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Seksjon>

      <Seksjon
        tittel="Kontaktperson"
        beskrivelse="Vises bare når administrator har gjort kontakten synlig."
      >
        {kontakter.length === 0 ? (
          <TomTilstand
            ikon={<User className="h-8 w-8" strokeWidth={1.5} />}
            tittel="Ingen kontaktperson tilgjengelig"
            tekst="Ta kontakt med operativ leder pa vakttelefonen ved behov."
          />
        ) : (
          <div className="space-y-2">
            {kontakter.map((kontakt) => (
              <Kort key={kontakt.id} className="p-4">
                <p className="text-sm font-medium text-tekst">{kontakt.name}</p>
                {kontakt.role_description && (
                  <p className="text-xs text-tekst-dempet">{kontakt.role_description}</p>
                )}
                {kontakt.phone && (
                  <a
                    href={`tel:${kontakt.phone.replace(/\s/g, '')}`}
                    className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-marine-700 text-sm font-semibold text-tekst ring-1 ring-linje hover:bg-marine-600"
                  >
                    <Phone className="h-4 w-4" strokeWidth={2} />
                    {kontakt.phone}
                  </a>
                )}
              </Kort>
            ))}
          </div>
        )}
      </Seksjon>
    </div>
  );
}
