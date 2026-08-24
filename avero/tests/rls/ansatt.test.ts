/**
 * Sikkerhetstester: en ansatt skal bare na sine egne data.
 *
 * Testene gar direkte pa databasen som den innloggede brukeren, med RLS
 * aktiv. De simulerer bade vanlige oppslag og forsok pa a hente andres
 * data via id - altsa akkurat det som skjer om noen gjetter en URL eller
 * kaller API-et manuelt.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { asUser, closePool, expectDenied, getPool } from '../setup/db';
import { seedIds } from '../../supabase/seed/dataset';

const { users, shifts, instructions, reports, journals, sites } = seedIds;

afterAll(closePool);

describe('Ansatt – egne data', () => {
  it('ser bare sin egen profil', async () => {
    await asUser(users.sara, async (query) => {
      const alle = await query('select id from profiles');
      expect(alle.rows).toHaveLength(1);
      expect(alle.rows[0].id).toBe(users.sara);

      const annen = await query('select id from profiles where id = $1', [users.tobias]);
      expect(annen.rows).toHaveLength(0);
    });
  });

  it('ser bare vakter som er tildelt henne selv (eller er ledige)', async () => {
    await asUser(users.sara, async (query) => {
      const fremmede = await query(`
        select s.id from shifts s
        where s.status <> 'ledig'
          and not exists (
            select 1 from shift_assignments sa
            where sa.shift_id = s.id and sa.employee_id = $1
          )`, [users.sara]);
      expect(fremmede.rows).toHaveLength(0);

      const egne = await query(`
        select count(*)::int as antall from shifts s
        join shift_assignments sa on sa.shift_id = s.id
        where sa.employee_id = $1`, [users.sara]);
      expect(Number(egne.rows[0].antall)).toBeGreaterThan(0);
    });
  });

  it('kan ikke apne en annen ansatts vakt via id (URL-forsok)', async () => {
    await asUser(users.sara, async (query) => {
      const treff = await query('select id from shifts where id = $1', [shifts.tobiasIgar]);
      expect(treff.rows).toHaveLength(0);
    });
  });

  it('ser aldri hvem andre som gar en vakt', async () => {
    await asUser(users.sara, async (query) => {
      const andre = await query(
        'select id from shift_assignments where employee_id <> $1', [users.sara],
      );
      expect(andre.rows).toHaveLength(0);
    });
  });

  it('kan verken endre eller slette en vakt', async () => {
    await asUser(users.sara, async (query) => {
      const endret = await query(
        `update shifts set notes = 'endret av ansatt' where id = $1`, [shifts.saraPagaende],
      );
      expect((endret as unknown as { rowCount: number }).rowCount).toBe(0);

      const slettet = await query('delete from shifts where id = $1', [shifts.saraPagaende]);
      expect((slettet as unknown as { rowCount: number }).rowCount).toBe(0);
    });
  });

  it('kan ikke endre sin egen rolle eller tilgang', async () => {
    await asUser(users.sara, async (query) => {
      const rolle = await expectDenied(
        query(`update profiles set role = 'administrator' where id = $1`, [users.sara]),
      );
      expect(rolle.denied).toBe(true);
      expect(rolle.message).toMatch(/administrator/i);

      const aktiv = await expectDenied(
        query('update profiles set is_active = false where id = $1', [users.sara]),
      );
      expect(aktiv.denied).toBe(true);

      // Navn og telefon kan hun derimot oppdatere selv.
      const navn = await query(
        `update profiles set phone = '+47 400 00 099' where id = $1`, [users.sara],
      );
      expect((navn as unknown as { rowCount: number }).rowCount).toBe(1);
    });
  });

  it('har ingen tilgang til revisjonsloggen', async () => {
    await asUser(users.sara, async (query) => {
      const logg = await query('select id from audit_logs');
      expect(logg.rows).toHaveLength(0);

      const skriv = await expectDenied(query(
        `insert into audit_logs (action, table_name) values ('tull', 'profiles')`,
      ));
      expect(skriv.denied).toBe(true);
    });
  });

  it('ser bare objekter hun er tilknyttet', async () => {
    await asUser(users.sara, async (query) => {
      const synlige = await query('select id from sites order by name');
      const ider = synlige.rows.map((r) => r.id);
      expect(ider).toContain(sites.kontorpark);
      expect(ider).toContain(sites.kjopesenter);
      expect(ider).not.toContain(sites.terminalNord);
      expect(ider).not.toContain(sites.boligtun);
    });
  });

  it('ser bare kontaktpersoner administrator har gjort synlige', async () => {
    await asUser(users.sara, async (query) => {
      const kontakter = await query('select name, visible_to_employee from site_contacts');
      expect(kontakter.rows.length).toBeGreaterThan(0);
      expect(kontakter.rows.every((r) => r.visible_to_employee === true)).toBe(true);
    });
  });
});

describe('Ansatt – instrukser', () => {
  it('ser bare instrukser som er tildelt henne', async () => {
    await asUser(users.sara, async (query) => {
      const synlige = await query('select id from instructions');
      const ider = synlige.rows.map((r) => r.id);

      expect(ider).toContain(instructions.generell);    // via avdeling
      expect(ider).toContain(instructions.kontorpark);  // via objekt
      expect(ider).toContain(instructions.vaktnaer);    // via en bestemt vakt
      expect(ider).not.toContain(instructions.nattlasing); // tildelt Tobias
      expect(ider).not.toContain(instructions.utrykning);  // objekt hun ikke har
    });
  });

  it('kan ikke hente en utildelt instruks via API-et', async () => {
    await asUser(users.sara, async (query) => {
      const direkte = await query('select id from instructions where id = $1', [instructions.nattlasing]);
      expect(direkte.rows).toHaveLength(0);

      const tildeling = await query(
        'select id from instruction_assignments where instruction_id = $1', [instructions.nattlasing],
      );
      expect(tildeling.rows).toHaveLength(0);
    });
  });

  it('kan ikke bekrefte en instruks hun ikke har tilgang til', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `insert into instruction_acknowledgements (company_id, instruction_id, profile_id, version)
         values ($1, $2, $3, 1)`,
        [seedIds.company, instructions.nattlasing, users.sara],
      ));
      expect(forsok.denied).toBe(true);
    });
  });

  it('kan bekrefte en tildelt instruks, og bekreftelsen gjelder gjeldende versjon', async () => {
    await asUser(users.sara, async (query) => {
      await query(
        `insert into instruction_acknowledgements (company_id, instruction_id, profile_id, version)
         values ($1, $2, $3, 1)`,
        [seedIds.company, instructions.kjopesenter, users.sara],
      );
      const lagret = await query(
        `select a.version, i.version as gjeldende
           from instruction_acknowledgements a
           join instructions i on i.id = a.instruction_id
          where a.instruction_id = $1 and a.profile_id = $2`,
        [instructions.kjopesenter, users.sara],
      );
      expect(lagret.rows[0].version).toBe(lagret.rows[0].gjeldende);
    });
  });

  it('ma bekrefte pa nytt nar instruksen har fatt ny versjon', async () => {
    await asUser(users.sara, async (query) => {
      const status = await query(
        `select i.version as gjeldende, a.version as bekreftet
           from instructions i
           left join instruction_acknowledgements a
             on a.instruction_id = i.id and a.profile_id = $1
          where i.id = $2`,
        [users.sara, instructions.generell],
      );
      expect(status.rows[0].gjeldende).toBe(2);
      expect(status.rows[0].bekreftet).toBe(1);
    });
  });
});

describe('Ansatt – rapporter', () => {
  it('ser bare egne rapporter', async () => {
    await asUser(users.sara, async (query) => {
      const andres = await query('select id from reports where reporter_id <> $1', [users.sara]);
      expect(andres.rows).toHaveLength(0);

      const direkte = await query('select id from reports where id = $1', [reports.tobiasHendelse]);
      expect(direkte.rows).toHaveLength(0);
    });
  });

  it('kan redigere eget utkast', async () => {
    await asUser(users.sara, async (query) => {
      const endret = await query(
        `update reports set description = 'Oppdatert beskrivelse' where id = $1`,
        [reports.saraUtkast],
      );
      expect((endret as unknown as { rowCount: number }).rowCount).toBe(1);
    });
  });

  it('kan ikke endre en rapport som er sendt inn', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `update reports set description = 'Endret i ettertid' where id = $1`,
        [reports.saraAvvik],
      ));
      expect(forsok.denied).toBe(true);
      expect(forsok.message).toMatch(/innsendt|last|ingen rader/i);
    });
  });

  it('kan ikke opprette en rapport i en annens navn', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `insert into reports (company_id, report_type, status, reporter_id, occurred_at, title)
         values ($1, 'avvik', 'utkast', $2, now(), 'Falsk rapport')`,
        [seedIds.company, users.tobias],
      ));
      expect(forsok.denied).toBe(true);
    });
  });

  it('kan ikke sette saksbehandlingsstatus selv', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `update reports set status = 'ferdigbehandlet' where id = $1`, [reports.saraUtkast],
      ));
      expect(forsok.denied).toBe(true);
    });
  });

  it('kan sende inn eget utkast, og innholdet blir last etterpa', async () => {
    await asUser(users.sara, async (query) => {
      const sendt = await query(
        `update reports set status = 'innsendt' where id = $1 returning submitted_at`,
        [reports.saraUtkast],
      );
      expect((sendt.rows[0] as { submitted_at: Date }).submitted_at).toBeTruthy();

      const etterpa = await expectDenied(query(
        `update reports set title = 'Endret etter innsending' where id = $1`, [reports.saraUtkast],
      ));
      expect(etterpa.denied).toBe(true);
    });
  });
});

describe('Ansatt – journal', () => {
  it('kan lese og skrive i journalen for sin egen pagaende vakt', async () => {
    await asUser(users.sara, async (query) => {
      const journal = await query('select id, status from journals where id = $1', [journals.saraPagaende]);
      expect(journal.rows).toHaveLength(1);

      const skrevet = await query(
        `insert into journal_entries (company_id, journal_id, author_id, entry_type, body)
         values ($1, $2, $3, 'notat', 'Testnotat fra sikkerhetstest') returning id`,
        [seedIds.company, journals.saraPagaende, users.sara],
      );
      expect(skrevet.rows).toHaveLength(1);
    });
  });

  it('ser ikke journalen til en annen ansatt', async () => {
    await asUser(users.sara, async (query) => {
      const annen = await query('select id from journals where id = $1', [journals.tobiasIgar]);
      expect(annen.rows).toHaveLength(0);

      const poster = await query(
        'select id from journal_entries where journal_id = $1', [journals.tobiasIgar],
      );
      expect(poster.rows).toHaveLength(0);
    });
  });

  it('kan ikke skrive i en annen ansatts journal', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `insert into journal_entries (company_id, journal_id, author_id, entry_type, body)
         values ($1, $2, $3, 'notat', 'Skrevet i feil journal')`,
        [seedIds.company, journals.tobiasIgar, users.sara],
      ));
      expect(forsok.denied).toBe(true);
    });
  });

  it('kan ikke endre eller slette journalposter', async () => {
    await asUser(users.sara, async (query) => {
      const endre = await expectDenied(query(
        `update journal_entries set body = 'endret' where journal_id = $1`, [journals.saraPagaende],
      ));
      expect(endre.denied).toBe(true);

      const slette = await expectDenied(query(
        'delete from journal_entries where journal_id = $1', [journals.saraPagaende],
      ));
      expect(slette.denied).toBe(true);
    });
  });

  it('kan ikke apne journal for en vakt som ligger langt tilbake i tid', async () => {
    const client = await getPool().connect();
    try {
      await client.query('begin');
      // En gammel vakt tildeles Sara direkte i databasen.
      const gammelVakt = '10000000-0000-4000-7000-000000000099';
      await client.query(
        `insert into shifts (id, company_id, site_id, starts_at, ends_at, status)
         values ($1, $2, $3, now() - interval '10 days', now() - interval '10 days' + interval '8 hours', 'fullfort')`,
        [gammelVakt, seedIds.company, sites.kontorpark],
      );
      await client.query(
        `insert into shift_assignments (company_id, shift_id, employee_id, status)
         values ($1, $2, $3, 'tildelt')`,
        [seedIds.company, gammelVakt, users.sara],
      );

      await client.query('select set_config($1, $2, true)', [
        'request.jwt.claims', JSON.stringify({ sub: users.sara, role: 'authenticated' }),
      ]);
      await client.query('set local role authenticated');

      let denied = false;
      try {
        await client.query(
          `insert into journals (company_id, shift_id, employee_id) values ($1, $2, $3)`,
          [seedIds.company, gammelVakt, users.sara],
        );
      } catch {
        denied = true;
      }
      expect(denied).toBe(true);
    } finally {
      await client.query('rollback').catch(() => undefined);
      client.release();
    }
  });
});

describe('Ansatt – ledige vakter', () => {
  it('kan se og soke pa en ledig vakt', async () => {
    await asUser(users.aisha, async (query) => {
      const ledige = await query(`select id from shifts where status = 'ledig'`);
      expect(ledige.rows.length).toBeGreaterThan(0);

      const soknad = await query(
        `insert into shift_assignments (company_id, shift_id, employee_id, status)
         values ($1, $2, $3, 'soknad') returning id`,
        [seedIds.company, ledige.rows[0].id, users.aisha],
      );
      expect(soknad.rows).toHaveLength(1);
    });
  });

  it('kan ikke tildele seg selv en vakt som ikke er ledig', async () => {
    await asUser(users.aisha, async (query) => {
      const forsok = await expectDenied(query(
        `insert into shift_assignments (company_id, shift_id, employee_id, status)
         values ($1, $2, $3, 'tildelt')`,
        [seedIds.company, shifts.saraPagaende, users.aisha],
      ));
      expect(forsok.denied).toBe(true);
    });
  });
});
