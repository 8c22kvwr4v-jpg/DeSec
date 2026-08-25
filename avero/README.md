# Avero Sikkerhet – internt arbeidsverktøy

Internt arbeidsverktøy for ansatte og ledelse i **Avero Sikkerhet AS**.
Løsningen kjører i nettleseren på mobil, nettbrett og PC – den skal ikke
publiseres i App Store.

Bygget med **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS 4** og
**Supabase (PostgreSQL)**.

---

## Innhold

- [Kort om løsningen](#kort-om-løsningen)
- [Roller og tilgang](#roller-og-tilgang)
- [Kom i gang](#kom-i-gang)
- [Miljøvariabler](#miljøvariabler)
- [Databasen](#databasen)
- [Testdata](#testdata)
- [Opprette administrator](#opprette-administrator)
- [Testing](#testing)
- [Publisering](#publisering)
- [Logo](#logo)
- [Prosjektstruktur](#prosjektstruktur)
- [Neste fase](#neste-fase)

---

## Kort om løsningen

**For ansatte**

| Side | Innhold |
| --- | --- |
| Hjem | Navn og stilling, dagens og neste vakt, snarvei til journal og rapport, instrukser som må leses, egne varslinger |
| Mine vakter | Ukevisning på PC, listevisning på mobil, navigering mellom uker, knapp til inneværende uke |
| Vaktdetaljer | Dato, tid, objekt, oppmøtested, adresse med kartknapp, vakttype, tildelte instrukser, kontaktperson når den er gjort synlig |
| Vaktjournal | Start og avslutt vakt, fortløpende notater med hendelsestype, sted og bildevedlegg, rettelser med historikk |
| Mine instrukser | Kun tildelte instrukser, med versjon, gyldighet og «Jeg har lest og forstått» |
| Rapporter | Avvik, hendelse, utrykning, fysisk makt, skade og vaktrapport – utkast kan redigeres, innsendte er låst |
| Kurs, varsler, ledige vakter, profil | Egne kurs med utløpsvarsling, egne varslinger, søking på ledige vakter og egne kontaktopplysninger |

**For ledelsen**

Eget administrasjonspanel med dagens vakter, ubemannede vakter, rapporter til
behandling, ansatte og brukere, kunder og objekter, turnus, instrukser og
tilgang, kurs og kompetanse, varslinger, revisjonslogg og CSV-eksport.

---

## Roller og tilgang

| Rolle | Ser |
| --- | --- |
| **Ansatt** | Kun egne vakter, egne journaler, egne rapporter, tildelte instrukser, egne kurs og varslinger |
| **Operativ leder** | Ansatte, vakter, objekter, journaler og rapporter innenfor tildelte avdelinger og objekter |
| **Administrator** | Alt innenfor eget selskap |

Tilgangen håndheves i **databasen** med Row Level Security, ikke bare i
grensesnittet. Alle spørringer fra appen går gjennom den innloggede brukerens
egen sesjon. Skriver noen inn en URL til en vakt, instruks, journal eller
rapport de ikke har tilgang til, returnerer databasen ingen rad, og siden viser
«Ingen tilgang». Det samme gjelder direkte kall mot API-et.

Service-nøkkelen brukes kun på serveren, og bare til å opprette og deaktivere
påloggingsbrukere. Den importeres aldri i klientkode – filen som eksporterer
den er merket `server-only`, slik at et forsøk gir byggefeil.

---

## Kom i gang

```bash
cd avero
npm install
cp .env.example .env.local     # fyll inn verdiene fra Supabase
npm run dev
```

Åpne <http://localhost:3000>.

Krever Node 20 eller nyere.

---

## Miljøvariabler

Legges i `.env.local` (skal aldri sjekkes inn):

| Variabel | Beskrivelse | Brukes av |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Adressen til Supabase-prosjektet | Klient og server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Offentlig nøkkel (anon/publishable) | Klient og server |
| `NEXT_PUBLIC_APP_URL` | Adressen appen kjører på, brukes i e-postlenker | Server |
| `SUPABASE_SERVICE_ROLE_KEY` | **Hemmelig.** Oppretting og deaktivering av brukere, samt testdata | Kun server |

Verdiene finnes i Supabase under **Project settings → API**.

---

## Databasen

### 1. Opprett prosjekt

Opprett et prosjekt på [supabase.com](https://supabase.com), og velg en region i
EU (for eksempel Frankfurt) siden løsningen behandler personopplysninger.

### 2. Kjør migrasjonene

Med Supabase CLI:

```bash
npx supabase link --project-ref <prosjekt-ref>
npx supabase db push
```

**Enklest:** åpne **SQL Editor** i Supabase, lim inn hele
`supabase/full-oppsett.sql` og kjør. Filen inneholder alle migrasjonene i
riktig rekkefølge, og kan kjøres om igjen uten å ødelegge data.

Filen genereres fra migrasjonene med `npm run sql:samle`, og består av:

| Fil | Innhold |
| --- | --- |
| `…_skjema.sql` | Tabeller, nøkler, indekser og sjekker |
| `…_funksjoner.sql` | Hjelpefunksjoner, revisjonslogg og vern mot uautoriserte endringer |
| `…_rls.sql` | Row Level Security på samtlige tabeller |
| `…_lagring.sql` | Private lagringsbøtter med tilgangsregler |

### 3. Tabeller

`companies`, `roles`, `departments`, `profiles`, `manager_scopes`,
`customers`, `sites`, `site_contacts`, `employee_site_access`, `shifts`,
`shift_assignments`, `journals`, `journal_entries`, `reports`,
`report_attachments`, `report_shares`, `instructions`,
`instruction_assignments`, `instruction_acknowledgements`, `qualifications`,
`notifications`, `audit_logs`.

Alle bruker UUID, `created_at`, `updated_at` og soft delete der det er
relevant. Sammensatte fremmednøkler `(id, company_id)` gjør det umulig å
koble data på tvers av selskaper.

### 4. Sentrale regler

- Journalposter kan ikke endres eller slettes. Rettelser lagres som nye poster
  med referanse til den opprinnelige.
- En rapport låses for rapportøren når den sendes inn, både av tilgangsreglene
  og av en trigger.
- Rolle, avdeling, selskap og aktiv/inaktiv kan bare endres av administrator.
- Endres innholdet i en instruks, økes versjonsnummeret automatisk, og
  lesebekreftelsen må gjentas.
- Endringer i sensitive tabeller skrives til `audit_logs` av en trigger.
- Journalen åpnes et bestemt antall minutter før vaktstart og stenger etter
  vaktslutt. Vinduet styres per selskap i `companies`.

### 5. Fillagring

Fire private bøtter opprettes av migrasjonen: `rapport-vedlegg`,
`journal-vedlegg`, `instruks-dokumenter` og `kvalifikasjoner`. Ingen av dem
er offentlige. Filene hentes med signerte lenker som varer i fem minutter, og
opplasting begrenses til mappen `{company_id}/{eier_id}/`.

---

## Testdata

Fiktive testdata for én administrator, én operativ leder, sju ansatte, tre
kunder, fem objekter, to uker med vakter, instrukser med ulike tildelinger,
journalposter, rapporter og kurs:

```bash
TILLAT_SEED_MOT_SKY=ja npm run seed
```

Alle navn, adresser og hendelser er oppdiktet. Passordet for demobrukerne
skrives ut når skriptet er ferdig.

Testdataene viser tilgangsmodellen i praksis:

- Sara ser ikke instruksen om nøkkelhåndtering – den er tildelt Tobias alene.
- Sara ser ikke Tobias' nattvakt, journal eller rapporter.
- Operativ leder ser stasjonær avdeling og Vestland Terminal Nord, men ikke
  arrangementsavdelingen.
- Den generelle vaktinstruksen er oppdatert til versjon 2, mens Sara har
  bekreftet versjon 1 – den ligger derfor under «Må leses».

---

## Opprette administrator

**Alternativ 1 – gjennom appen.** Logg inn som administrator og bruk
**Administrasjon → Ansatte → Ny bruker**.

**Alternativ 2 – første administrator i et tomt prosjekt.**

1. Opprett brukeren i Supabase under **Authentication → Users → Add user**
   (huk av for bekreftet e-post).
2. Kjør i SQL Editor:

```sql
insert into companies (name, org_number)
values ('Avero Sikkerhet AS', '999 888 777')
returning id;

insert into profiles (id, company_id, first_name, last_name, email, role, job_title)
values (
  '<bruker-id fra Authentication>',
  '<selskaps-id fra spørringen over>',
  'Fornavn', 'Etternavn', 'fornavn.etternavn@avero.no',
  'administrator', 'Driftssjef'
);
```

Deretter kan resten av brukerne opprettes fra administrasjonspanelet.

---

## Testing

```bash
npm run db:test:up     # starter en lokal PostgreSQL for testene
npm test               # alle tester
npm run test:rls       # kun sikkerhetstestene
npm run test:unit      # kun dato- og klokkeslettstestene
npm run db:test:down   # stopper databasen
```

Sikkerhetstestene kjører **de virkelige migrasjonene og de virkelige
RLS-policyene** mot en ekte PostgreSQL. De opptrer som innloggede brukere ved å
sette `request.jwt.claims` og bytte til databaserollen `authenticated`,
nøyaktig slik Supabase gjør for hver forespørsel.

Testene dekker blant annet:

- ansatt ser kun egen profil, egne vakter, egne rapporter og tildelte instrukser
- ansatt kan ikke åpne en annen ansatts vakt, journal, rapport eller instruks
  via id – verken fra grensesnittet eller direkte mot API-et
- ansatt ser aldri hvem andre som går en vakt
- innsendt rapport kan ikke endres, journalposter kan ikke slettes
- ansatt kan ikke endre egen rolle, gi seg selv objekttilgang, tildele seg selv
  en instruks eller opprette brukere
- operativ leder ser kun tildelt ansvarsområde
- administrator har full tilgang i eget selskap
- ingen ser data fra et annet selskap, og en deaktivert bruker mister all
  tilgang umiddelbart
- vakter over midnatt lagres og beregnes riktig, også over sommertidsskiftet

Typekontroll og bygg:

```bash
npm run typecheck
npm run build
```

---

## Publisering

### Vercel (anbefalt)

1. Koble GitHub-repoet til Vercel og velg `avero` som **Root Directory**.
2. Legg inn miljøvariablene under **Settings → Environment Variables**.
   `SUPABASE_SERVICE_ROLE_KEY` legges kun inn som server-variabel.
3. Sett `NEXT_PUBLIC_APP_URL` til den endelige adressen.
4. I Supabase under **Authentication → URL Configuration**: legg inn samme
   adresse som *Site URL*, og `https://…/auth/callback` som *Redirect URL*.

### Egen server

```bash
npm run build
npm start        # kjører på port 3000
```

Sett løsningen bak HTTPS. Sikkerhetshoder (HSTS, `X-Frame-Options`,
`X-Content-Type-Options`, referrer- og tillatelsespolicy) settes av
`next.config.ts`.

---

## Logo

Appen bruker foreløpig en tekstlogo, «AVERO SIKKERHET», definert i
`src/components/logo.tsx`. Når den endelige logoen er klar:

1. Legg filen i `public/` (for eksempel `public/avero-logo.svg`).
2. Bytt ut innholdet i `Logo`-komponenten med en `<Image>` som peker på filen.

Alle steder som viser logoen bruker den samme komponenten, så det er nok å
endre den ene filen.

---

## Prosjektstruktur

```
avero/
  src/
    app/
      logg-inn/            Pålogging, glemt passord, nytt passord
      (portal)/            Ansattflaten (hjem, vakter, instrukser, rapporter …)
      admin/               Administrasjonspanel
      auth/callback/       Tar imot lenker fra e-post
    components/            Designsystem, navigasjon, skjemaer
    lib/
      dates.ts             Norsk dato og 24-timers klokke, midnatt og sommertid
      auth.ts              Innlogget bruker, rollekrav og startside
      supabase/            Klienter for nettleser, server og administrasjon
    server/
      data/                Spørringer (alltid gjennom brukerens egen sesjon)
      actions/             Server actions med validering
  supabase/
    migrations/            Skjema, funksjoner, RLS og lagring
    seed/dataset.ts        Fiktive testdata
  tests/
    rls/                   Sikkerhetstester mot ekte PostgreSQL
    unit/                  Dato- og klokkeslettslogikk
  scripts/
    seed.ts                Legger testdata inn i Supabase
    test-db.sh             Lokal PostgreSQL for testene
```

---

## Neste fase

Anbefalte utvidelser, i prioritert rekkefølge:

1. **Tofaktorautentisering** – Supabase støtter TOTP. Bør kreves for
   administrator og operativ leder.
2. **Varsling på mobil** – push eller e-post ved ny vakt, ny instruks og ved
   rapport som venter på behandling.
3. **Godkjenning av søknader på ledige vakter** – i dag registreres søknaden,
   men tildelingen gjøres manuelt av administrator.
4. **Timelister og grunnlag for lønn** – summering av faktiske timer fra
   journalen, med eksport.
5. **PDF-utskrift av rapporter** – for oversendelse til kunde, politi eller
   forsikring.
6. **Offline-støtte i journalen** – slik at notater kan skrives uten dekning og
   sendes når nettet er tilbake.
7. **Kvitteringspunkter for kontrollrunder** – NFC- eller QR-merker på objektet
   som registreres i journalen.
8. **Automatisk varsling om kurs som utløper** – i dag vises status, men
   varslingen må sendes manuelt.
9. **Oppbevaringstid og sletting** – automatisk anonymisering av gamle
   journaler og rapporter etter selskapets slettefrister.
