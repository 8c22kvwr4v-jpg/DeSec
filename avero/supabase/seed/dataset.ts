/**
 * Fiktive testdata for Avero Sikkerhet AS.
 *
 * Alle navn, adresser, telefonnummer og hendelser er oppdiktet. Ingen
 * ekte personopplysninger skal legges inn her.
 *
 * Samme datasett brukes bade av `npm run seed` (mot Supabase) og av
 * sikkerhetstestene (mot en lokal PostgreSQL), slik at testene kjorer mot
 * nøyaktig de dataene demoen viser.
 */
import { addDays, osloParts, osloTime, startOfWeek } from '../../src/lib/dates';

export type SeedUser = {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'ansatt' | 'operativ_leder' | 'administrator';
  job_title: string;
  phone: string;
  employee_number: string;
  department: 'stasjonaer' | 'mobil' | 'arrangement' | null;
};

export type SeedTable = { table: string; rows: Record<string, unknown>[] };
/** Oppdateringer som kjores etter innsetting, for a utlose triggere. */
export type SeedUpdate = { table: string; id: string; values: Record<string, unknown> };

/** Felles passord for demobrukerne. Byttes for produksjon. */
export const DEMO_PASSWORD = 'Avero!Demo2026';

const COMPANY = 'a0000000-0000-4000-8000-000000000001';

const DEPT = {
  stasjonaer:  'd0000000-0000-4000-8000-000000000001',
  mobil:       'd0000000-0000-4000-8000-000000000002',
  arrangement: 'd0000000-0000-4000-8000-000000000003',
} as const;

const USER = {
  admin:   'b0000000-0000-4000-8000-000000000001',
  leder:   'b0000000-0000-4000-8000-000000000002',
  sara:    'b0000000-0000-4000-8000-000000000011',
  tobias:  'b0000000-0000-4000-8000-000000000012',
  aisha:   'b0000000-0000-4000-8000-000000000013',
  petter:  'b0000000-0000-4000-8000-000000000014',
  elin:    'b0000000-0000-4000-8000-000000000015',
  david:   'b0000000-0000-4000-8000-000000000016',
  nina:    'b0000000-0000-4000-8000-000000000017',
} as const;

const CUSTOMER = {
  nordvik:  'c0000000-0000-4000-8000-000000000001',
  bryggen:  'c0000000-0000-4000-8000-000000000002',
  vestland: 'c0000000-0000-4000-8000-000000000003',
} as const;

const SITE = {
  kontorpark:   'e0000000-0000-4000-8000-000000000001',
  kjopesenter:  'e0000000-0000-4000-8000-000000000002',
  terminalNord: 'e0000000-0000-4000-8000-000000000003',
  boligtun:     'e0000000-0000-4000-8000-000000000004',
  terminalSor:  'e0000000-0000-4000-8000-000000000005',
} as const;

const INSTRUCTION = {
  generell:   'f0000000-0000-4000-8000-000000000001',
  kontorpark: 'f0000000-0000-4000-8000-000000000002',
  kjopesenter:'f0000000-0000-4000-8000-000000000003',
  utrykning:  'f0000000-0000-4000-8000-000000000004',
  nattlasing: 'f0000000-0000-4000-8000-000000000005',
  vaktnaer:   'f0000000-0000-4000-8000-000000000006',
} as const;

const SHIFT = {
  saraPagaende:   '10000000-0000-4000-8000-000000000001',
  tobiasIgar:     '10000000-0000-4000-8000-000000000002',
  saraNeste:      '10000000-0000-4000-8000-000000000003',
} as const;

const JOURNAL = {
  saraPagaende: '20000000-0000-4000-8000-000000000001',
  tobiasIgar:   '20000000-0000-4000-8000-000000000002',
} as const;

const REPORT = {
  saraAvvik:      '30000000-0000-4000-8000-000000000001',
  saraUtkast:     '30000000-0000-4000-8000-000000000002',
  tobiasHendelse: '30000000-0000-4000-8000-000000000003',
  aishaMakt:      '30000000-0000-4000-8000-000000000004',
  petterSkade:    '30000000-0000-4000-8000-000000000005',
  elinUtrykning:  '30000000-0000-4000-8000-000000000006',
  ninaVaktrapport:'30000000-0000-4000-8000-000000000007',
} as const;

export const seedIds = {
  company: COMPANY,
  departments: DEPT,
  users: USER,
  customers: CUSTOMER,
  sites: SITE,
  instructions: INSTRUCTION,
  shifts: SHIFT,
  journals: JOURNAL,
  reports: REPORT,
};

export const seedUsers: SeedUser[] = [
  {
    id: USER.admin, email: 'ingrid.saeterdal@avero.test', password: DEMO_PASSWORD,
    first_name: 'Ingrid', last_name: 'Sæterdal', role: 'administrator',
    job_title: 'Driftssjef', phone: '+47 400 00 001', employee_number: 'AV-001', department: null,
  },
  {
    id: USER.leder, email: 'morten.braaten@avero.test', password: DEMO_PASSWORD,
    first_name: 'Morten', last_name: 'Bråten', role: 'operativ_leder',
    job_title: 'Operativ leder', phone: '+47 400 00 002', employee_number: 'AV-002', department: 'stasjonaer',
  },
  {
    id: USER.sara, email: 'sara.hellevik@avero.test', password: DEMO_PASSWORD,
    first_name: 'Sara', last_name: 'Hellevik', role: 'ansatt',
    job_title: 'Vekter', phone: '+47 400 00 011', employee_number: 'AV-011', department: 'stasjonaer',
  },
  {
    id: USER.tobias, email: 'tobias.ronning@avero.test', password: DEMO_PASSWORD,
    first_name: 'Tobias', last_name: 'Rønning', role: 'ansatt',
    job_title: 'Vekter', phone: '+47 400 00 012', employee_number: 'AV-012', department: 'stasjonaer',
  },
  {
    id: USER.aisha, email: 'aisha.nordby@avero.test', password: DEMO_PASSWORD,
    first_name: 'Aisha', last_name: 'Nordby', role: 'ansatt',
    job_title: 'Vekter', phone: '+47 400 00 013', employee_number: 'AV-013', department: 'stasjonaer',
  },
  {
    id: USER.petter, email: 'petter.grimsrud@avero.test', password: DEMO_PASSWORD,
    first_name: 'Petter', last_name: 'Grimsrud', role: 'ansatt',
    job_title: 'Mobil vekter', phone: '+47 400 00 014', employee_number: 'AV-014', department: 'mobil',
  },
  {
    id: USER.elin, email: 'elin.kvamme@avero.test', password: DEMO_PASSWORD,
    first_name: 'Elin', last_name: 'Kvamme', role: 'ansatt',
    job_title: 'Mobil vekter', phone: '+47 400 00 015', employee_number: 'AV-015', department: 'mobil',
  },
  {
    id: USER.david, email: 'david.osei@avero.test', password: DEMO_PASSWORD,
    first_name: 'David', last_name: 'Osei', role: 'ansatt',
    job_title: 'Arrangementsvakt', phone: '+47 400 00 016', employee_number: 'AV-016', department: 'arrangement',
  },
  {
    id: USER.nina, email: 'nina.thorsen@avero.test', password: DEMO_PASSWORD,
    first_name: 'Nina', last_name: 'Thorsen', role: 'ansatt',
    job_title: 'Arrangementsvakt', phone: '+47 400 00 017', employee_number: 'AV-017', department: 'arrangement',
  },
];

/** Runder ned til naermeste kvarter, slik at demoen ser ryddig ut. */
function roundToQuarter(date: Date): Date {
  const ms = 15 * 60000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
}

/** Tidspunkt i norsk tid, n dager etter en gitt dato. */
function dayAt(base: Date, dayOffset: number, hour: number, minute = 0): Date {
  const p = osloParts(addDays(base, dayOffset));
  return osloTime(p.year, p.month, p.day, hour, minute);
}

function iso(date: Date): string {
  return date.toISOString();
}

function dateOnly(date: Date): string {
  const p = osloParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function buildSeed(
  now: Date = new Date(),
): { tables: SeedTable[]; users: SeedUser[]; updates: SeedUpdate[] } {
  const weekStart = startOfWeek(now);          // mandag inneværende uke
  const today = now;

  // -------------------------------------------------------------------
  // Vakter: to hele uker, med dag-, kvelds- og nattvakter. Nattvaktene
  // gar over midnatt og dekker dermed testen for dognskille.
  // -------------------------------------------------------------------
  type ShiftPlan = {
    id?: string;
    day: number;
    site: string;
    type: string;
    from: [number, number];
    to: [number, number];
    nextDay: boolean;
    employee?: string;
    status?: string;
    notes?: string;
    meeting?: string;
  };

  const rotation = (list: string[], day: number) => list[day % list.length];
  const plans: ShiftPlan[] = [];

  for (let day = 0; day < 14; day++) {
    // Nordvik Kontorpark - dagvakt og nattvakt
    plans.push({
      day, site: SITE.kontorpark, type: 'stasjonaer', from: [7, 0], to: [19, 0], nextDay: false,
      employee: rotation([USER.sara, USER.tobias, USER.aisha], day),
    });
    plans.push({
      day, site: SITE.kontorpark, type: 'stasjonaer', from: [19, 0], to: [7, 0], nextDay: true,
      employee: rotation([USER.tobias, USER.aisha, USER.sara], day),
      notes: 'Nattvakt. Låserunde kl. 23:00 og 03:00.',
    });
    // Bryggen Kjøpesenter - kveldsvakt
    plans.push({
      day, site: SITE.kjopesenter, type: 'stasjonaer', from: [15, 0], to: [23, 0], nextDay: false,
      employee: day === 3 || day === 10 ? undefined : rotation([USER.aisha, USER.sara, USER.david], day),
      status: day === 3 || day === 10 ? 'ledig' : undefined,
    });
    // Vestland Terminal Nord - nattvakt over midnatt
    plans.push({
      day, site: SITE.terminalNord, type: 'rundering', from: [22, 0], to: [6, 0], nextDay: true,
      employee: rotation([USER.petter, USER.tobias], day),
      notes: 'Kontrollrunder hver andre time. Port 3 låses kl. 23:00.',
    });
    // Nordvik Boligtun - rundering natt til tirsdag, torsdag og lørdag
    if (day % 7 === 1 || day % 7 === 3 || day % 7 === 5) {
      plans.push({
        day, site: SITE.boligtun, type: 'rundering', from: [23, 0], to: [5, 0], nextDay: true,
        employee: day === 5 ? undefined : rotation([USER.petter, USER.elin], day),
        status: day === 5 ? 'planlagt' : undefined,
      });
    }
    // Vestland Terminal Sør - arrangement i helgene
    if (day % 7 === 5 || day % 7 === 6) {
      plans.push({
        day, site: SITE.terminalSor, type: 'arrangement', from: [18, 0], to: [2, 0], nextDay: true,
        employee: rotation([USER.david, USER.nina, USER.elin], day),
        meeting: 'Hovedport vest, ved vaktbua',
      });
    }
  }

  const shifts: Record<string, unknown>[] = [];
  const assignments: Record<string, unknown>[] = [];

  plans.forEach((plan, index) => {
    const id = plan.id ?? `10000000-0000-4000-9000-${String(index + 1).padStart(12, '0')}`;
    const starts = dayAt(weekStart, plan.day, plan.from[0], plan.from[1]);
    const ends = dayAt(weekStart, plan.day + (plan.nextDay ? 1 : 0), plan.to[0], plan.to[1]);
    const status = plan.status ?? (plan.employee
      ? (ends.getTime() < today.getTime() ? 'fullfort' : 'tildelt')
      : 'planlagt');

    shifts.push({
      id, company_id: COMPANY, site_id: plan.site, shift_type: plan.type,
      starts_at: iso(starts), ends_at: iso(ends), status,
      meeting_point: plan.meeting ?? null, notes: plan.notes ?? null, created_by: USER.admin,
    });

    if (plan.employee) {
      assignments.push({
        id: `11000000-0000-4000-9000-${String(index + 1).padStart(12, '0')}`,
        company_id: COMPANY, shift_id: id, employee_id: plan.employee,
        status: 'tildelt', assigned_by: USER.admin, assigned_at: iso(dayAt(weekStart, -3, 9)),
      });
    }
  });

  // Pagaende vakt for Sara, slik at journalen alltid kan demonstreres.
  const pagaendeStart = roundToQuarter(new Date(today.getTime() - 2 * 3600000));
  const pagaendeSlutt = roundToQuarter(new Date(today.getTime() + 6 * 3600000));
  shifts.push({
    id: SHIFT.saraPagaende, company_id: COMPANY, site_id: SITE.kontorpark,
    shift_type: 'stasjonaer', starts_at: iso(pagaendeStart), ends_at: iso(pagaendeSlutt),
    status: 'pagaende', meeting_point: 'Resepsjonen, hovedinngang øst',
    notes: 'Byggemøte i 3. etasje kl. 14:00 – slipp inn eksterne mot legitimasjon.',
    created_by: USER.admin,
  });
  assignments.push({
    id: '11000000-0000-4000-8000-000000000001', company_id: COMPANY,
    shift_id: SHIFT.saraPagaende, employee_id: USER.sara, status: 'tildelt',
    assigned_by: USER.admin, assigned_at: iso(dayAt(weekStart, -3, 9)),
  });

  // Avsluttet nattvakt for Tobias (i gar) med ferdig journal.
  const igarStart = dayAt(today, -1, 19, 0);
  const igarSlutt = dayAt(today, 0, 7, 0);
  shifts.push({
    id: SHIFT.tobiasIgar, company_id: COMPANY, site_id: SITE.terminalNord,
    shift_type: 'rundering', starts_at: iso(igarStart), ends_at: iso(igarSlutt),
    status: 'fullfort', meeting_point: 'Vaktbu port 1', notes: null, created_by: USER.admin,
  });
  assignments.push({
    id: '11000000-0000-4000-8000-000000000002', company_id: COMPANY,
    shift_id: SHIFT.tobiasIgar, employee_id: USER.tobias, status: 'tildelt',
    assigned_by: USER.admin, assigned_at: iso(dayAt(weekStart, -3, 9)),
  });

  // Neste vakt for Sara (i morgen kveld), for "Neste vakt" pa startsiden.
  const nesteStart = dayAt(today, 1, 22, 0);
  const nesteSlutt = dayAt(today, 2, 6, 0);
  shifts.push({
    id: SHIFT.saraNeste, company_id: COMPANY, site_id: SITE.kjopesenter,
    shift_type: 'stasjonaer', starts_at: iso(nesteStart), ends_at: iso(nesteSlutt),
    status: 'tildelt', meeting_point: 'Varemottak, inngang nord',
    notes: 'Nattlåsing av senteret. Husk å kontrollere nødutganger.',
    created_by: USER.admin,
  });
  assignments.push({
    id: '11000000-0000-4000-8000-000000000003', company_id: COMPANY,
    shift_id: SHIFT.saraNeste, employee_id: USER.sara, status: 'tildelt',
    assigned_by: USER.admin, assigned_at: iso(dayAt(weekStart, -3, 9)),
  });

  // -------------------------------------------------------------------
  // Journaler
  // -------------------------------------------------------------------
  const journals = [
    {
      id: JOURNAL.saraPagaende, company_id: COMPANY, shift_id: SHIFT.saraPagaende,
      employee_id: USER.sara, status: 'apen', started_at: iso(pagaendeStart), ended_at: null,
    },
    {
      id: JOURNAL.tobiasIgar, company_id: COMPANY, shift_id: SHIFT.tobiasIgar,
      employee_id: USER.tobias, status: 'avsluttet',
      started_at: iso(igarStart), ended_at: iso(igarSlutt),
    },
  ];

  const journalEntries = [
    {
      id: '21000000-0000-4000-8000-000000000001', company_id: COMPANY,
      journal_id: JOURNAL.saraPagaende, author_id: USER.sara, entry_type: 'vakt_start',
      occurred_at: iso(pagaendeStart), body: 'Vakt startet. Overtatt nøkkelknippe 4 og radio 2.',
      location: 'Resepsjonen',
    },
    {
      id: '21000000-0000-4000-8000-000000000002', company_id: COMPANY,
      journal_id: JOURNAL.saraPagaende, author_id: USER.sara, entry_type: 'kontrollrunde',
      occurred_at: iso(new Date(pagaendeStart.getTime() + 45 * 60000)),
      body: 'Kontrollrunde 1 av 4 gjennomført. Ingen avvik. Alle branndører lukket.',
      location: 'Etasje 1–4',
    },
    {
      id: '21000000-0000-4000-8000-000000000003', company_id: COMPANY,
      journal_id: JOURNAL.saraPagaende, author_id: USER.sara, entry_type: 'observasjon',
      occurred_at: iso(new Date(pagaendeStart.getTime() + 95 * 60000)),
      body: 'Lys stod på i møterom 3B etter arbeidstid. Slukket og notert til driftsavdelingen.',
      location: 'Møterom 3B',
    },
    {
      id: '21000000-0000-4000-8000-000000000011', company_id: COMPANY,
      journal_id: JOURNAL.tobiasIgar, author_id: USER.tobias, entry_type: 'vakt_start',
      occurred_at: iso(igarStart), body: 'Vakt startet ved port 1. Værforhold: regn og vind.',
      location: 'Vaktbu port 1',
    },
    {
      id: '21000000-0000-4000-8000-000000000012', company_id: COMPANY,
      journal_id: JOURNAL.tobiasIgar, author_id: USER.tobias, entry_type: 'lasing',
      occurred_at: iso(new Date(igarStart.getTime() + 4 * 3600000)),
      body: 'Port 3 låst og kontrollert kl. 23:00 som avtalt med driftsleder.',
      location: 'Port 3',
    },
    {
      id: '21000000-0000-4000-8000-000000000013', company_id: COMPANY,
      journal_id: JOURNAL.tobiasIgar, author_id: USER.tobias, entry_type: 'hendelse',
      occurred_at: iso(new Date(igarStart.getTime() + 6 * 3600000)),
      body: 'Uvedkommende person observert ved lasterampe. Personen forlot området etter anmodning. Ingen skade eller tyveri konstatert.',
      location: 'Lasterampe vest',
    },
    {
      id: '21000000-0000-4000-8000-000000000014', company_id: COMPANY,
      journal_id: JOURNAL.tobiasIgar, author_id: USER.tobias, entry_type: 'rettelse',
      occurred_at: iso(new Date(igarStart.getTime() + 6.5 * 3600000)),
      body: 'Rettelse til forrige post: hendelsen skjedde ved lasterampe ØST, ikke vest.',
      location: 'Lasterampe øst',
      corrects_entry_id: '21000000-0000-4000-8000-000000000013',
    },
    {
      id: '21000000-0000-4000-8000-000000000015', company_id: COMPANY,
      journal_id: JOURNAL.tobiasIgar, author_id: USER.tobias, entry_type: 'vakt_slutt',
      occurred_at: iso(igarSlutt), body: 'Vakt avsluttet. Nøkler og radio levert tilbake.',
      location: 'Vaktbu port 1',
    },
  ];

  // -------------------------------------------------------------------
  // Rapporter
  // -------------------------------------------------------------------
  const reports = [
    {
      id: REPORT.saraAvvik, company_id: COMPANY, report_number: 'AVR-DEMO-00001',
      report_type: 'avvik', status: 'innsendt', site_id: SITE.kontorpark,
      shift_id: null, reporter_id: USER.sara, occurred_at: iso(dayAt(today, -2, 23, 15)),
      title: 'Nødutgang blokkert av paller',
      description: 'Nødutgang C i parkeringskjeller var blokkert av tre paller med byggevarer.',
      sequence_of_events: 'Oppdaget under kontrollrunde kl. 23:15. Pallene stod inntil døren og hindret åpning.',
      actions_taken: 'Pallene ble flyttet til lagerrom. Driftsleder varslet på telefon.',
      notified: 'Driftsleder hos kunden', witnesses: null,
      personal_injury: false, material_damage: false, physical_force: false, police_notified: false,
      submitted_at: iso(dayAt(today, -2, 23, 55)),
    },
    {
      id: REPORT.saraUtkast, company_id: COMPANY, report_number: 'AVR-DEMO-00002',
      report_type: 'vaktrapport', status: 'utkast', site_id: SITE.kontorpark,
      shift_id: SHIFT.saraPagaende, reporter_id: USER.sara, occurred_at: iso(pagaendeStart),
      title: 'Vaktrapport – dagvakt Nordvik Kontorpark',
      description: 'Rolig vakt uten avvik så langt.',
      sequence_of_events: null, actions_taken: null, notified: null, witnesses: null,
      personal_injury: false, material_damage: false, physical_force: false, police_notified: false,
    },
    {
      id: REPORT.tobiasHendelse, company_id: COMPANY, report_number: 'AVR-DEMO-00003',
      report_type: 'hendelse', status: 'under_behandling', site_id: SITE.terminalNord,
      shift_id: SHIFT.tobiasIgar, reporter_id: USER.tobias, occurred_at: iso(new Date(igarStart.getTime() + 6 * 3600000)),
      title: 'Uvedkommende ved lasterampe',
      description: 'Person uten adgangskort observert innenfor gjerdet ved lasterampe øst.',
      sequence_of_events: 'Personen ble påtruffet kl. 01:00, oppga å lete etter en snarvei og ble fulgt ut hovedporten.',
      actions_taken: 'Området kontrollert. Ingen tegn til innbrudd. Kameraopptak sikret.',
      notified: 'Operativ leder', witnesses: 'Sjåfør fra transportør, navn ikke oppgitt',
      personal_injury: false, material_damage: false, physical_force: false, police_notified: false,
      submitted_at: iso(dayAt(today, 0, 7, 30)), handler_id: USER.leder,
      handling_note: 'Under vurdering sammen med kunde. Vurderer ekstra kameradekning.',
    },
    {
      id: REPORT.aishaMakt, company_id: COMPANY, report_number: 'AVR-DEMO-00004',
      report_type: 'maktbruk', status: 'innsendt', site_id: SITE.kjopesenter,
      shift_id: null, reporter_id: USER.aisha, occurred_at: iso(dayAt(today, -4, 20, 40)),
      title: 'Bortvisning med fysisk håndtering',
      description: 'Kunde nektet å forlate senteret etter gjentatte anmodninger.',
      sequence_of_events: 'Personen ble anmodet om å forlate senteret tre ganger. Ved fjerde anmodning ble vedkommende ledsaget ut med grep om overarm.',
      actions_taken: 'Personen forlot området. Senterleder informert.',
      notified: 'Senterleder', witnesses: 'Butikkmedarbeider ved hovedinngang',
      personal_injury: false, material_damage: false, physical_force: true,
      physical_force_details: 'Ledsagelse med grep om overarm i om lag 10 sekunder. Ingen tegn til skade.',
      police_notified: false, submitted_at: iso(dayAt(today, -4, 21, 20)),
    },
    {
      id: REPORT.petterSkade, company_id: COMPANY, report_number: 'AVR-DEMO-00005',
      report_type: 'skade', status: 'ferdigbehandlet', site_id: SITE.boligtun,
      shift_id: null, reporter_id: USER.petter, occurred_at: iso(dayAt(today, -8, 2, 10)),
      title: 'Knust rute i inngangsdør',
      description: 'Rute i inngangsdør B var knust ved ankomst til rundering.',
      sequence_of_events: 'Oppdaget kl. 02:10. Ingen personer i området. Glasset lå på utsiden.',
      actions_taken: 'Området sikret med sperrebånd. Vaktmester og kunde varslet.',
      notified: 'Vaktmester, kundens kontaktperson', witnesses: null,
      personal_injury: false, material_damage: true,
      material_damage_details: 'Én rute (ca. 60x90 cm) i inngangsdør B.',
      physical_force: false, police_notified: false,
      submitted_at: iso(dayAt(today, -8, 3, 0)), handler_id: USER.admin,
      handling_note: 'Glassmester rekvirert av kunde. Saken avsluttet.',
      closed_at: iso(dayAt(today, -6, 12, 0)),
    },
    {
      id: REPORT.elinUtrykning, company_id: COMPANY, report_number: 'AVR-DEMO-00006',
      report_type: 'utrykning', status: 'innsendt', site_id: SITE.terminalSor,
      shift_id: null, reporter_id: USER.elin, occurred_at: iso(dayAt(today, -1, 3, 25)),
      title: 'Alarmutrykning – bevegelsesdetektor lager 2',
      description: 'Utrykning etter alarm fra bevegelsesdetektor.',
      sequence_of_events: 'Ankom kl. 03:25, 14 minutter etter alarm. Kontroll av bygget viste ingen tegn til innbrudd. Alarmen utløst av presenning som blafret i trekk fra ventilasjon.',
      actions_taken: 'Presenning festet. Alarmsentral informert om årsak.',
      notified: 'Alarmsentral', witnesses: null,
      personal_injury: false, material_damage: false, physical_force: false, police_notified: false,
      submitted_at: iso(dayAt(today, -1, 4, 10)),
    },
    {
      id: REPORT.ninaVaktrapport, company_id: COMPANY, report_number: 'AVR-DEMO-00007',
      report_type: 'vaktrapport', status: 'innsendt', site_id: SITE.terminalSor,
      shift_id: null, reporter_id: USER.nina, occurred_at: iso(dayAt(today, -3, 2, 0)),
      title: 'Vaktrapport – arrangement Vestland Terminal Sør',
      description: 'Arrangement med om lag 400 gjester. Rolig gjennomføring.',
      sequence_of_events: 'To gjester bortvist ved inngang på grunn av beruselse. Ingen konflikter for øvrig.',
      actions_taken: 'Bortvisning ved inngang. Arrangør informert.',
      notified: 'Arrangør', witnesses: null,
      personal_injury: false, material_damage: false, physical_force: false, police_notified: false,
      submitted_at: iso(dayAt(today, -3, 3, 30)),
    },
  ];

  // -------------------------------------------------------------------
  // Instrukser med ulike tildelinger
  // -------------------------------------------------------------------
  const instructions = [
    {
      id: INSTRUCTION.generell, company_id: COMPANY,
      title: 'Generell vaktinstruks – Avero Sikkerhet',
      summary: 'Grunnleggende krav til uniform, rapportering, taushetsplikt og varsling.',
      body: [
        'FORMÅL',
        'Instruksen beskriver hvordan vektere i Avero Sikkerhet AS skal opptre i tjeneste.',
        '',
        'UNIFORM OG LEGITIMASJON',
        'Godkjent uniform og synlig vekterkort skal bæres i hele vakten.',
        '',
        'RAPPORTERING',
        'Alle hendelser føres i vaktjournalen fortløpende. Avvik og hendelser rapporteres',
        'i rapportmodulen før vakten avsluttes.',
        '',
        'TAUSHETSPLIKT',
        'Opplysninger om kunder, objekter og personer skal ikke deles utenfor tjenesten.',
        '',
        'VARSLING',
        'Ved akutte hendelser varsles nødetater først, deretter operativ leder på vakttelefon.',
      ].join('\n'),
      site_id: null, version: 1, valid_from: dateOnly(dayAt(today, -180, 12)),
      valid_to: null, requires_acknowledgement: true, created_by: USER.admin,
    },
    {
      id: INSTRUCTION.kontorpark, company_id: COMPANY,
      title: 'Objektinstruks – Nordvik Kontorpark',
      summary: 'Adgangskontroll, låserutiner og kontrollrunder for kontorparken.',
      body: [
        'ADGANGSKONTROLL',
        'Eksterne slippes inn mot legitimasjon og avtale. Besøkende registreres i besøksloggen.',
        '',
        'KONTROLLRUNDER',
        'Fire runder per vakt: etasje 1–4, parkeringskjeller, tak og uteområde.',
        '',
        'LÅSERUTINER',
        'Hovedinngang låses kl. 18:00. Sideinnganger kontrolleres kl. 19:00 og 23:00.',
        '',
        'ALARM',
        'Ved brannalarm: kontroller panel i resepsjonen, meld til 110 ved bekreftet brann.',
      ].join('\n'),
      site_id: SITE.kontorpark, version: 1, valid_from: dateOnly(dayAt(today, -90, 12)),
      valid_to: null, requires_acknowledgement: true, created_by: USER.admin,
    },
    {
      id: INSTRUCTION.kjopesenter, company_id: COMPANY,
      title: 'Objektinstruks – Bryggen Kjøpesenter',
      summary: 'Rutiner for kveldsvakt, nattlåsing og håndtering av butikktyveri.',
      body: [
        'KVELDSVAKT',
        'Synlig tilstedeværelse i fellesarealene fra kl. 15:00 til stengetid.',
        '',
        'NATTLÅSING',
        'Etter stengetid kontrolleres alle butikkfronter, nødutganger og varemottak.',
        '',
        'BUTIKKTYVERI',
        'Butikkens personale håndterer forholdet. Vekter bistår kun ved anmodning og',
        'innenfor rammen av nødverge og pågripelsesretten.',
      ].join('\n'),
      site_id: SITE.kjopesenter, version: 1, valid_from: dateOnly(dayAt(today, -60, 12)),
      valid_to: null, requires_acknowledgement: true, created_by: USER.admin,
    },
    {
      id: INSTRUCTION.utrykning, company_id: COMPANY,
      title: 'Utrykningsrutine – Vestland Terminal Nord',
      summary: 'Responstid, kontrollpunkter og varsling ved alarm på terminalen.',
      body: [
        'RESPONSTID',
        'Utrykning skal påbegynnes innen 10 minutter etter mottatt alarm.',
        '',
        'KONTROLLPUNKTER',
        'Port 1, port 3, lasterampe øst, lager 2 og kontorbrakke.',
        '',
        'VARSLING',
        'Alarmsentral informeres om årsak før utrykningen avsluttes.',
      ].join('\n'),
      site_id: SITE.terminalNord, version: 1, valid_from: dateOnly(dayAt(today, -45, 12)),
      valid_to: null, requires_acknowledgement: true, created_by: USER.admin,
    },
    {
      id: INSTRUCTION.nattlasing, company_id: COMPANY,
      title: 'Særskilt instruks – nøkkelhåndtering nattlåsing',
      summary: 'Gjelder kun vektere med utvidet nøkkelansvar.',
      body: [
        'NØKKELANSVAR',
        'Nøkkelknippe 7 kvitteres ut ved vaktstart og leveres tilbake ved vaktslutt.',
        '',
        'AVVIK',
        'Manglende nøkkel meldes umiddelbart til operativ leder, uansett tidspunkt.',
      ].join('\n'),
      site_id: SITE.terminalNord, version: 1, valid_from: dateOnly(dayAt(today, -30, 12)),
      valid_to: null, requires_acknowledgement: true, created_by: USER.admin,
    },
    {
      id: INSTRUCTION.vaktnaer, company_id: COMPANY,
      title: 'Tilleggsinstruks – byggemøte 3. etasje',
      summary: 'Gjelder for én bestemt vakt ved Nordvik Kontorpark.',
      body: [
        'BYGGEMØTE',
        'Eksterne deltakere slippes inn mot legitimasjon og føres opp i besøksloggen.',
        'Møterom 3B skal kontrolleres og låses etter møteslutt.',
      ].join('\n'),
      site_id: SITE.kontorpark, version: 1, valid_from: dateOnly(dayAt(today, -1, 12)),
      valid_to: dateOnly(dayAt(today, 14, 12)), requires_acknowledgement: false, created_by: USER.admin,
    },
  ];

  const instructionAssignments = [
    // Generell instruks tildeles hver avdeling - aldri automatisk til alle.
    { id: '41000000-0000-4000-8000-000000000001', instruction_id: INSTRUCTION.generell, department_id: DEPT.stasjonaer },
    { id: '41000000-0000-4000-8000-000000000002', instruction_id: INSTRUCTION.generell, department_id: DEPT.mobil },
    { id: '41000000-0000-4000-8000-000000000003', instruction_id: INSTRUCTION.generell, department_id: DEPT.arrangement },
    // Objektinstrukser til alle med tilgang til objektet.
    { id: '41000000-0000-4000-8000-000000000004', instruction_id: INSTRUCTION.kontorpark, site_id: SITE.kontorpark },
    { id: '41000000-0000-4000-8000-000000000005', instruction_id: INSTRUCTION.kjopesenter, site_id: SITE.kjopesenter },
    // Rolle ved objekt: gjelder bare ansatte (ikke ledere) ved terminalen.
    { id: '41000000-0000-4000-8000-000000000006', instruction_id: INSTRUCTION.utrykning, site_id: SITE.terminalNord, site_role: 'ansatt' },
    // Kun én bestemt ansatt.
    { id: '41000000-0000-4000-8000-000000000007', instruction_id: INSTRUCTION.nattlasing, profile_id: USER.tobias },
    // Kun én bestemt vakt.
    { id: '41000000-0000-4000-8000-000000000008', instruction_id: INSTRUCTION.vaktnaer, shift_id: SHIFT.saraPagaende },
  ].map((row) => ({
    company_id: COMPANY,
    profile_id: null, site_id: null, shift_id: null, department_id: null, site_role: null,
    valid_from: dateOnly(dayAt(today, -30, 12)), valid_to: null,
    requires_acknowledgement: true, assigned_by: USER.admin,
    ...row,
  }));

  const acknowledgements = [
    {
      id: '42000000-0000-4000-8000-000000000001', company_id: COMPANY,
      instruction_id: INSTRUCTION.generell, profile_id: USER.sara, version: 1,
      acknowledged_at: iso(dayAt(today, -20, 8, 15)),
    },
    {
      id: '42000000-0000-4000-8000-000000000002', company_id: COMPANY,
      instruction_id: INSTRUCTION.kontorpark, profile_id: USER.sara, version: 1,
      acknowledged_at: iso(dayAt(today, -20, 8, 20)),
    },
    {
      id: '42000000-0000-4000-8000-000000000003', company_id: COMPANY,
      instruction_id: INSTRUCTION.nattlasing, profile_id: USER.tobias, version: 1,
      acknowledged_at: iso(dayAt(today, -10, 19, 5)),
    },
  ];

  // -------------------------------------------------------------------
  // Kurs og godkjenninger
  // -------------------------------------------------------------------
  const qualifications = [
    ['q1', USER.sara,   'Vekterkurs trinn 1',    'kurs',        -900, 1200],
    ['q2', USER.sara,   'Vekterkurs trinn 2',    'kurs',        -700, 1200],
    ['q3', USER.sara,   'Førstehjelp – grunnkurs','kurs',       -710,   21],
    ['q4', USER.tobias, 'Vekterkurs trinn 1',    'kurs',        -1200, 400],
    ['q5', USER.tobias, 'Regodkjenning vekter',  'godkjenning', -300,  430],
    ['q6', USER.aisha,  'Vekterkurs trinn 1',    'kurs',        -500,  800],
    ['q7', USER.aisha,  'Konflikthåndtering',    'kurs',        -200,  530],
    ['q8', USER.petter, 'Vekterkurs trinn 1',    'kurs',        -800,  600],
    ['q9', USER.petter, 'Utrykningskjøring kode 160', 'godkjenning', -400, 90],
    ['q10', USER.elin,  'Vekterkurs trinn 1',    'kurs',        -650,  700],
    ['q11', USER.david, 'Arrangementsvakt',      'kurs',        -350,  380],
    ['q12', USER.nina,  'Vekterkurs trinn 1',    'kurs',        -1100, 260],
    ['q13', USER.nina,  'Førstehjelp – grunnkurs','kurs',       -740,  -10],
  ].map(([key, profile, name, kind, issued, expires], index) => ({
    id: `50000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    company_id: COMPANY, profile_id: profile as string, name: name as string,
    kind: kind as string, issuer: 'Avero Sikkerhet AS / ekstern kursleverandør',
    certificate_number: `SERT-${String(index + 1).padStart(4, '0')}`,
    issued_on: dateOnly(dayAt(today, issued as number, 12)),
    expires_on: dateOnly(dayAt(today, expires as number, 12)),
    document_path: null,
  }));

  // -------------------------------------------------------------------
  // Varslinger
  // -------------------------------------------------------------------
  const notifications = [
    {
      profile_id: USER.sara, title: 'Ny instruks må leses',
      body: 'Generell vaktinstruks er oppdatert til versjon 2. Bekreft at du har lest den.',
      kind: 'instruks', link: `/instrukser/${INSTRUCTION.generell}`, offset: -2,
    },
    {
      profile_id: USER.sara, title: 'Ny vakt tildelt',
      body: 'Du er satt opp på nattvakt ved Bryggen Kjøpesenter i morgen kl. 22:00.',
      kind: 'vakt', link: `/vakter/${SHIFT.saraNeste}`, offset: -1,
    },
    {
      profile_id: USER.sara, title: 'Kurs utløper snart',
      body: 'Førstehjelp – grunnkurs utløper om 21 dager.',
      kind: 'kurs', link: '/kurs', offset: -1,
    },
    {
      profile_id: USER.tobias, title: 'Rapport under behandling',
      body: 'Hendelsesrapporten din er tatt til behandling av operativ leder.',
      kind: 'rapport', link: `/rapporter/${REPORT.tobiasHendelse}`, offset: 0,
    },
    {
      profile_id: USER.tobias, title: 'Ny instruks tildelt',
      body: 'Særskilt instruks om nøkkelhåndtering er tildelt deg.',
      kind: 'instruks', link: `/instrukser/${INSTRUCTION.nattlasing}`, offset: -10,
    },
    {
      profile_id: USER.aisha, title: 'Ledig vakt utlyst',
      body: 'Kveldsvakt ved Bryggen Kjøpesenter er ledig. Du kan søke i appen.',
      kind: 'vakt', link: '/ledige-vakter', offset: -1,
    },
    {
      profile_id: USER.petter, title: 'Godkjenning utløper snart',
      body: 'Utrykningskjøring kode 160 utløper om 90 dager.',
      kind: 'kurs', link: '/kurs', offset: -5,
    },
    {
      profile_id: USER.nina, title: 'Kurs utløpt',
      body: 'Førstehjelp – grunnkurs er utløpt. Ta kontakt med operativ leder.',
      kind: 'kurs', link: '/kurs', offset: -3,
    },
  ].map((row, index) => ({
    id: `60000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    company_id: COMPANY, profile_id: row.profile_id, title: row.title, body: row.body,
    kind: row.kind, link: row.link, read_at: index === 2 ? iso(dayAt(today, -1, 9)) : null,
    created_at: iso(dayAt(today, row.offset, 8, 30)),
  }));

  // -------------------------------------------------------------------
  // Samlet datasett i innsettingsrekkefølge
  // -------------------------------------------------------------------
  const tables: SeedTable[] = [
    {
      table: 'companies',
      rows: [{
        id: COMPANY, name: 'Avero Sikkerhet AS', org_number: '999 888 777',
        open_shifts_enabled: true, journal_open_before_minutes: 60, journal_open_after_minutes: 720,
      }],
    },
    {
      table: 'departments',
      rows: [
        { id: DEPT.stasjonaer, company_id: COMPANY, name: 'Stasjonær vakt', description: 'Faste vakthold ved kontor og senter.' },
        { id: DEPT.mobil, company_id: COMPANY, name: 'Mobil og rundering', description: 'Runderinger og alarmutrykning.' },
        { id: DEPT.arrangement, company_id: COMPANY, name: 'Arrangement', description: 'Arrangementer og publikumsvakthold.' },
      ],
    },
    {
      table: 'profiles',
      rows: seedUsers.map((u) => ({
        id: u.id, company_id: COMPANY,
        department_id: u.department ? DEPT[u.department] : null,
        employee_number: u.employee_number, first_name: u.first_name, last_name: u.last_name,
        email: u.email, phone: u.phone, job_title: u.job_title, role: u.role, is_active: true,
      })),
    },
    {
      table: 'customers',
      rows: [
        { id: CUSTOMER.nordvik, company_id: COMPANY, name: 'Nordvik Eiendom AS', org_number: '911 222 333', contact_name: 'Driftsleder Nordvik', contact_phone: '+47 55 00 10 00', contact_email: 'drift@nordvik.test' },
        { id: CUSTOMER.bryggen, company_id: COMPANY, name: 'Bryggen Kjøpesenter AS', org_number: '922 333 444', contact_name: 'Senterleder', contact_phone: '+47 55 00 20 00', contact_email: 'senter@bryggen.test' },
        { id: CUSTOMER.vestland, company_id: COMPANY, name: 'Vestland Logistikk AS', org_number: '933 444 555', contact_name: 'Terminalsjef', contact_phone: '+47 55 00 30 00', contact_email: 'terminal@vestland.test' },
      ],
    },
    {
      table: 'sites',
      rows: [
        { id: SITE.kontorpark, company_id: COMPANY, customer_id: CUSTOMER.nordvik, department_id: DEPT.stasjonaer, name: 'Nordvik Kontorpark', code: 'NKP', address: 'Kanalveien 12', postal_code: '5068', city: 'Bergen', meeting_point: 'Resepsjonen, hovedinngang øst', notes: 'Fire etasjer og parkeringskjeller.' },
        { id: SITE.kjopesenter, company_id: COMPANY, customer_id: CUSTOMER.bryggen, department_id: DEPT.stasjonaer, name: 'Bryggen Kjøpesenter', code: 'BKS', address: 'Torgallmenningen 8', postal_code: '5014', city: 'Bergen', meeting_point: 'Varemottak, inngang nord', notes: '42 butikker. Stengetid kl. 20:00.' },
        { id: SITE.terminalNord, company_id: COMPANY, customer_id: CUSTOMER.vestland, department_id: DEPT.mobil, name: 'Vestland Terminal Nord', code: 'VTN', address: 'Kokstadflaten 4', postal_code: '5257', city: 'Kokstad', meeting_point: 'Vaktbu port 1', notes: 'Inngjerdet område med fire porter.' },
        { id: SITE.boligtun, company_id: COMPANY, customer_id: CUSTOMER.nordvik, department_id: DEPT.mobil, name: 'Nordvik Boligtun', code: 'NBT', address: 'Fjellveien 33', postal_code: '5019', city: 'Bergen', meeting_point: 'Inngang B', notes: 'Rundering to ganger per natt.' },
        { id: SITE.terminalSor, company_id: COMPANY, customer_id: CUSTOMER.vestland, department_id: DEPT.arrangement, name: 'Vestland Terminal Sør', code: 'VTS', address: 'Hardangerveien 90', postal_code: '5224', city: 'Nesttun', meeting_point: 'Hovedport vest', notes: 'Brukes til arrangementer i helgene.' },
      ],
    },
    {
      table: 'site_contacts',
      rows: [
        { id: '70000000-0000-4000-8000-000000000001', company_id: COMPANY, site_id: SITE.kontorpark, name: 'Vaktmester Nordvik', role_description: 'Teknisk drift', phone: '+47 55 00 11 11', email: null, visible_to_employee: true },
        { id: '70000000-0000-4000-8000-000000000002', company_id: COMPANY, site_id: SITE.kontorpark, name: 'Eiendomssjef', role_description: 'Kundens ledelse', phone: '+47 55 00 11 22', email: null, visible_to_employee: false },
        { id: '70000000-0000-4000-8000-000000000003', company_id: COMPANY, site_id: SITE.kjopesenter, name: 'Senterleder', role_description: 'Kundens kontaktperson', phone: '+47 55 00 22 11', email: null, visible_to_employee: true },
        { id: '70000000-0000-4000-8000-000000000004', company_id: COMPANY, site_id: SITE.terminalNord, name: 'Driftsleder terminal', role_description: 'Nattkontakt', phone: '+47 55 00 33 11', email: null, visible_to_employee: true },
        { id: '70000000-0000-4000-8000-000000000005', company_id: COMPANY, site_id: SITE.terminalSor, name: 'Arrangementsansvarlig', role_description: 'Kun for ledelsen', phone: '+47 55 00 33 22', email: null, visible_to_employee: false },
      ],
    },
    {
      table: 'manager_scopes',
      rows: [
        { id: '80000000-0000-4000-8000-000000000001', company_id: COMPANY, manager_id: USER.leder, department_id: DEPT.stasjonaer, site_id: null },
        { id: '80000000-0000-4000-8000-000000000002', company_id: COMPANY, manager_id: USER.leder, department_id: null, site_id: SITE.terminalNord },
      ],
    },
    {
      table: 'employee_site_access',
      rows: [
        [USER.sara, SITE.kontorpark], [USER.sara, SITE.kjopesenter],
        [USER.tobias, SITE.kontorpark], [USER.tobias, SITE.terminalNord],
        [USER.aisha, SITE.kjopesenter], [USER.aisha, SITE.kontorpark],
        [USER.petter, SITE.terminalNord], [USER.petter, SITE.boligtun],
        [USER.elin, SITE.boligtun], [USER.elin, SITE.terminalSor],
        [USER.david, SITE.kjopesenter], [USER.david, SITE.terminalSor],
        [USER.nina, SITE.terminalSor],
      ].map(([profile, site], index) => ({
        id: `90000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        company_id: COMPANY, profile_id: profile, site_id: site,
        valid_from: dateOnly(dayAt(today, -200, 12)), valid_to: null, granted_by: USER.admin,
      })),
    },
    { table: 'shifts', rows: shifts },
    { table: 'shift_assignments', rows: assignments },
    { table: 'journals', rows: journals },
    { table: 'journal_entries', rows: journalEntries },
    { table: 'reports', rows: reports },
    { table: 'instructions', rows: instructions },
    { table: 'instruction_assignments', rows: instructionAssignments },
    { table: 'instruction_acknowledgements', rows: acknowledgements },
    { table: 'qualifications', rows: qualifications },
    { table: 'notifications', rows: notifications },
  ];

  // Etter innsetting oppdateres den generelle instruksen. Triggeren hever
  // versjonen til 2, og Sara sin lesebekreftelse pa versjon 1 blir dermed
  // utdatert - akkurat slik en ny versjon skal handteres i drift.
  const updates: SeedUpdate[] = [
    {
      table: 'instructions',
      id: INSTRUCTION.generell,
      values: {
        summary: 'Grunnleggende krav til uniform, rapportering, taushetsplikt og varsling. Oppdatert med nytt punkt om varsling av operativ leder.',
      },
    },
  ];

  return { tables, users: seedUsers, updates };
}
