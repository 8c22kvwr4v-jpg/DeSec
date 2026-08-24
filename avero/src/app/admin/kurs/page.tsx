import Link from 'next/link';
import type { Metadata } from 'next';
import { GraduationCap } from 'lucide-react';
import { krevRolle } from '@/lib/auth';
import { hentKursAdmin } from '@/server/data/admin';
import { Kort, Merkelapp, Seksjon, TomTilstand } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { kursstatus, kvalifikasjonstypeNavn } from '@/lib/etiketter';

export const metadata: Metadata = { title: 'Kurs og kompetanse' };

export default async function AdminKursSide() {
  await krevRolle('administrator', 'operativ_leder');
  const kurs = await hentKursAdmin();

  const utløpt = kurs.filter((k) => kursstatus(k.kurs.expires_on).tone === 'kritisk');
  const snart = kurs.filter((k) => kursstatus(k.kurs.expires_on).tone === 'advarsel');
  const gyldige = kurs.filter((k) => {
    const tone = kursstatus(k.kurs.expires_on).tone;
    return tone !== 'kritisk' && tone !== 'advarsel';
  });

  function rad({ kurs: k, ansatt }: (typeof kurs)[number]) {
    const status = kursstatus(k.expires_on);
    return (
      <li key={k.id}>
        <Kort className="flex min-h-16 items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <Link
              href={`/admin/ansatte/${k.profile_id}`}
              className="block truncate text-sm font-medium text-aksent-lys hover:underline"
            >
              {ansatt}
            </Link>
            <span className="block truncate text-xs text-tekst-dempet">
              {k.name} · {kvalifikasjonstypeNavn[k.kind]}
              {k.expires_on && ` · utløper ${formatDate(k.expires_on)}`}
            </span>
          </span>
          <Merkelapp tone={status.tone}>{status.tekst}</Merkelapp>
        </Kort>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Kurs og kompetanse</h1>
        <p className="mt-1 text-sm text-tekst-dempet">
          {kurs.length} registreringer · {utløpt.length} utløpt · {snart.length} utløper snart
        </p>
      </header>

      {kurs.length === 0 && (
        <TomTilstand
          ikon={<GraduationCap className="h-8 w-8" strokeWidth={1.5} />}
          tittel="Ingen kurs registrert"
          tekst="Kurs registreres på den enkelte ansatte."
        />
      )}

      {utløpt.length > 0 && (
        <Seksjon tittel="Utløpt"><ul className="space-y-2">{utløpt.map(rad)}</ul></Seksjon>
      )}
      {snart.length > 0 && (
        <Seksjon tittel="Utløper snart"><ul className="space-y-2">{snart.map(rad)}</ul></Seksjon>
      )}
      {gyldige.length > 0 && (
        <Seksjon tittel="Gyldige"><ul className="space-y-2">{gyldige.map(rad)}</ul></Seksjon>
      )}
    </div>
  );
}
