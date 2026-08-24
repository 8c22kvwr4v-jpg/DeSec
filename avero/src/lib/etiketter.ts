/** Norske etiketter og fargekoder for statusverdier. */
import type {
  Journalposttype, Rapportstatus, Rapporttype, Rolle, Tildelingsstatus,
  Vaktstatus, Vakttype, Varseltype, Kvalifikasjonstype,
} from '@/lib/database.types';

export type Tone = 'nøytral' | 'aktiv' | 'positiv' | 'advarsel' | 'kritisk' | 'aksent';

export const rolleNavn: Record<Rolle, string> = {
  ansatt: 'Ansatt',
  operativ_leder: 'Operativ leder',
  administrator: 'Administrator',
};

export const vaktstatusNavn: Record<Vaktstatus, string> = {
  planlagt: 'Ubemannet',
  ledig: 'Ledig',
  tildelt: 'Tildelt',
  pagaende: 'Pågår',
  fullfort: 'Fullført',
  avlyst: 'Avlyst',
};

export const vaktstatusTone: Record<Vaktstatus, Tone> = {
  planlagt: 'advarsel',
  ledig: 'aksent',
  tildelt: 'nøytral',
  pagaende: 'aktiv',
  fullfort: 'positiv',
  avlyst: 'kritisk',
};

export const vakttypeNavn: Record<Vakttype, string> = {
  stasjonaer: 'Stasjonær vakt',
  rundering: 'Rundering',
  arrangement: 'Arrangement',
  utrykning: 'Utrykning',
  resepsjon: 'Resepsjon',
  verditransport: 'Verditransport',
};

export const tildelingsstatusNavn: Record<Tildelingsstatus, string> = {
  tildelt: 'Tildelt',
  godkjent: 'Godkjent',
  soknad: 'Søknad sendt',
  avslatt: 'Avslått',
  trukket: 'Trukket',
};

export const rapporttypeNavn: Record<Rapporttype, string> = {
  avvik: 'Avviksrapport',
  hendelse: 'Hendelsesrapport',
  utrykning: 'Utrykningsrapport',
  maktbruk: 'Rapport om bruk av fysisk makt',
  skade: 'Skaderapport',
  vaktrapport: 'Rapport etter avsluttet vakt',
};

export const rapporttypeKort: Record<Rapporttype, string> = {
  avvik: 'Avvik',
  hendelse: 'Hendelse',
  utrykning: 'Utrykning',
  maktbruk: 'Fysisk makt',
  skade: 'Skade',
  vaktrapport: 'Vaktrapport',
};

export const rapportstatusNavn: Record<Rapportstatus, string> = {
  utkast: 'Utkast',
  innsendt: 'Innsendt',
  under_behandling: 'Under behandling',
  ferdigbehandlet: 'Ferdigbehandlet',
};

export const rapportstatusTone: Record<Rapportstatus, Tone> = {
  utkast: 'nøytral',
  innsendt: 'aksent',
  under_behandling: 'advarsel',
  ferdigbehandlet: 'positiv',
};

export const journalposttypeNavn: Record<Journalposttype, string> = {
  vakt_start: 'Vakt startet',
  vakt_slutt: 'Vakt avsluttet',
  kontrollrunde: 'Kontrollrunde',
  apning: 'Åpning',
  lasing: 'Låsing',
  observasjon: 'Observasjon',
  hendelse: 'Hendelse',
  avvik: 'Avvik',
  notat: 'Notat',
  rettelse: 'Rettelse',
};

export const varseltypeNavn: Record<Varseltype, string> = {
  info: 'Informasjon',
  vakt: 'Vakt',
  instruks: 'Instruks',
  rapport: 'Rapport',
  kurs: 'Kurs',
  avvik: 'Avvik',
};

export const kvalifikasjonstypeNavn: Record<Kvalifikasjonstype, string> = {
  kurs: 'Kurs',
  godkjenning: 'Godkjenning',
  dokument: 'Dokument',
};

/** Gyldighetsstatus for kurs og godkjenninger. */
export function kursstatus(utloper: string | null, iDag = new Date()): {
  tekst: string; tone: Tone;
} {
  if (!utloper) return { tekst: 'Uten utløp', tone: 'nøytral' };
  const dager = Math.ceil(
    (new Date(`${utloper}T12:00:00Z`).getTime() - iDag.getTime()) / 86_400_000,
  );
  if (dager < 0) return { tekst: 'Utløpt', tone: 'kritisk' };
  if (dager <= 60) return { tekst: `Utløper om ${dager} d`, tone: 'advarsel' };
  return { tekst: 'Gyldig', tone: 'positiv' };
}
