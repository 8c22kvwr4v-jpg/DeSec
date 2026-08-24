import { NextResponse, type NextRequest } from 'next/server';
import { hentBruker } from '@/lib/auth';
import {
  hentAnsatte, hentKursAdmin, hentRapporterAdmin, hentRevisjonslogg, hentVakterIPeriode,
} from '@/server/data/admin';
import { addDays, formatDate, formatDateTime, startOfWeek } from '@/lib/dates';
import { rapportstatusNavn, rapporttypeNavn, rolleNavn, vaktstatusNavn, vakttypeNavn } from '@/lib/etiketter';

/**
 * CSV-eksport.
 *
 * Bare administrator far eksportere. Uttrekket gar gjennom de vanlige
 * spørringene, sa Row Level Security gjelder ogsa her.
 */

const SKILLETEGN = ';';

function csvFelt(verdi: unknown): string {
  const tekst = verdi === null || verdi === undefined ? '' : String(verdi);
  return /[";\n]/.test(tekst) ? `"${tekst.replace(/"/g, '""')}"` : tekst;
}

function tilCsv(overskrifter: string[], rader: unknown[][]): string {
  const linjer = [
    overskrifter.join(SKILLETEGN),
    ...rader.map((rad) => rad.map(csvFelt).join(SKILLETEGN)),
  ];
  // BOM slik at norske tegn vises riktig i Excel.
  return `﻿${linjer.join('\r\n')}\r\n`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const bruker = await hentBruker();
  if (!bruker) {
    return NextResponse.json({ feil: 'Ikke innlogget' }, { status: 401 });
  }
  if (bruker.profil.role !== 'administrator') {
    return NextResponse.json({ feil: 'Ingen tilgang til eksport' }, { status: 403 });
  }

  const { type } = await params;
  const ukerFrem = Number(request.nextUrl.searchParams.get('uker') ?? 4);

  let filnavn: string;
  let innhold: string;

  switch (type) {
    case 'vakter': {
      const fra = startOfWeek(new Date());
      const vakter = await hentVakterIPeriode(fra, addDays(fra, 7 * Math.min(ukerFrem, 26)));
      filnavn = 'avero-vakter.csv';
      innhold = tilCsv(
        ['Dato', 'Start', 'Slutt', 'Objekt', 'Vakttype', 'Status', 'Ansatt'],
        vakter.map(({ vakt, objekt, tildelinger }) => [
          formatDate(vakt.starts_at),
          formatDateTime(vakt.starts_at),
          formatDateTime(vakt.ends_at),
          objekt?.name ?? '',
          vakttypeNavn[vakt.shift_type],
          vaktstatusNavn[vakt.status],
          tildelinger.map((t) => t.ansatt?.full_name ?? '').join(', '),
        ]),
      );
      break;
    }
    case 'ansatte': {
      const ansatte = await hentAnsatte();
      filnavn = 'avero-ansatte.csv';
      innhold = tilCsv(
        ['Ansattnummer', 'Navn', 'E-post', 'Telefon', 'Stilling', 'Rolle', 'Aktiv'],
        ansatte.map((a) => [
          a.employee_number ?? '', a.full_name, a.email, a.phone ?? '',
          a.job_title ?? '', rolleNavn[a.role], a.is_active ? 'Ja' : 'Nei',
        ]),
      );
      break;
    }
    case 'rapporter': {
      const rapporter = await hentRapporterAdmin();
      filnavn = 'avero-rapporter.csv';
      innhold = tilCsv(
        ['Rapportnummer', 'Type', 'Status', 'Tidspunkt', 'Objekt', 'Rapportør', 'Tittel',
          'Personskade', 'Materiell skade', 'Fysisk makt', 'Politi varslet'],
        rapporter.map(({ rapport, objekt, rapportor }) => [
          rapport.report_number,
          rapporttypeNavn[rapport.report_type],
          rapportstatusNavn[rapport.status],
          formatDateTime(rapport.occurred_at),
          objekt?.name ?? '',
          rapportor ?? '',
          rapport.title,
          rapport.personal_injury ? 'Ja' : 'Nei',
          rapport.material_damage ? 'Ja' : 'Nei',
          rapport.physical_force ? 'Ja' : 'Nei',
          rapport.police_notified ? 'Ja' : 'Nei',
        ]),
      );
      break;
    }
    case 'kurs': {
      const kurs = await hentKursAdmin();
      filnavn = 'avero-kurs.csv';
      innhold = tilCsv(
        ['Ansatt', 'Navn', 'Type', 'Utsteder', 'Utstedt', 'Utløper'],
        kurs.map(({ kurs: k, ansatt }) => [
          ansatt, k.name, k.kind, k.issuer ?? '',
          k.issued_on ? formatDate(k.issued_on) : '',
          k.expires_on ? formatDate(k.expires_on) : '',
        ]),
      );
      break;
    }
    case 'revisjonslogg': {
      const logg = await hentRevisjonslogg(1000);
      filnavn = 'avero-revisjonslogg.csv';
      innhold = tilCsv(
        ['Tidspunkt', 'Aktør', 'Handling', 'Tabell', 'Rad'],
        logg.map(({ logg: rad, aktor }) => [
          formatDateTime(rad.created_at), aktor, rad.action, rad.table_name, rad.row_id ?? '',
        ]),
      );
      break;
    }
    default:
      return NextResponse.json({ feil: 'Ukjent eksporttype' }, { status: 404 });
  }

  return new NextResponse(innhold, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filnavn}"`,
      'Cache-Control': 'no-store',
    },
  });
}
