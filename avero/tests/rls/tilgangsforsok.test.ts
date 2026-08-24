/**
 * Flere forsok pa a omga tilgangsreglene, alle utfort som en vanlig
 * ansatt. Ingen av dem skal lykkes.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { asUser, closePool, expectDenied } from '../setup/db';
import { seedIds } from '../../supabase/seed/dataset';

const { users, sites, instructions } = seedIds;

afterAll(closePool);

describe('Ansatt forsoker a utvide egen tilgang', () => {
  it('kan ikke gi seg selv ansvarsomrade som leder', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `insert into manager_scopes (company_id, manager_id, site_id)
         values ($1, $2, $3)`,
        [seedIds.company, users.sara, sites.terminalNord],
      ));
      expect(forsok.denied).toBe(true);
    });
  });

  it('kan ikke gi seg selv tilgang til et nytt objekt', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `insert into employee_site_access (company_id, profile_id, site_id)
         values ($1, $2, $3)`,
        [seedIds.company, users.sara, sites.terminalSor],
      ));
      expect(forsok.denied).toBe(true);
    });
  });

  it('kan ikke tildele seg selv en instruks', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `insert into instruction_assignments (company_id, instruction_id, profile_id)
         values ($1, $2, $3)`,
        [seedIds.company, instructions.nattlasing, users.sara],
      ));
      expect(forsok.denied).toBe(true);
    });
  });

  it('kan ikke opprette en vakt til seg selv', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `insert into shifts (company_id, site_id, starts_at, ends_at)
         values ($1, $2, now() + interval '1 day', now() + interval '1 day 8 hours')`,
        [seedIds.company, sites.kontorpark],
      ));
      expect(forsok.denied).toBe(true);
    });
  });

  it('ser ikke andres kurs eller varslinger', async () => {
    await asUser(users.sara, async (query) => {
      const kurs = await query('select id from qualifications where profile_id <> $1', [users.sara]);
      expect(kurs.rows).toHaveLength(0);

      const varsler = await query('select id from notifications where profile_id <> $1', [users.sara]);
      expect(varsler.rows).toHaveLength(0);
    });
  });

  it('kan ikke opprette en bruker', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `insert into profiles (id, company_id, first_name, last_name, email, role)
         values (gen_random_uuid(), $1, 'Falsk', 'Bruker', 'falsk@avero.test', 'administrator')`,
        [seedIds.company],
      ));
      expect(forsok.denied).toBe(true);
    });
  });

  it('kan ikke gi seg selv utvidet tilgang til en annens rapport', async () => {
    await asUser(users.sara, async (query) => {
      const forsok = await expectDenied(query(
        `insert into report_shares (company_id, report_id, profile_id)
         values ($1, $2, $3)`,
        [seedIds.company, seedIds.reports.tobiasHendelse, users.sara],
      ));
      expect(forsok.denied).toBe(true);
    });
  });
});

describe('Vakter over midnatt', () => {
  it('lagres og regnes riktig over dognskillet', async () => {
    type Nattvakt = { timer: string; ulike_dager: boolean };
    await asUser<Nattvakt>(users.tobias, async (query) => {
      const nattvakter = await query(`
        select s.starts_at, s.ends_at,
               extract(epoch from (s.ends_at - s.starts_at)) / 3600 as timer,
               (s.starts_at at time zone 'Europe/Oslo')::date
                 <> (s.ends_at at time zone 'Europe/Oslo')::date as ulike_dager
          from shifts s
          join shift_assignments sa on sa.shift_id = s.id
         where sa.employee_id = $1
           and (s.starts_at at time zone 'Europe/Oslo')::date
             <> (s.ends_at at time zone 'Europe/Oslo')::date
         limit 5`, [users.tobias]);

      expect(nattvakter.rows.length).toBeGreaterThan(0);
      for (const vakt of nattvakter.rows) {
        expect(vakt.ulike_dager).toBe(true);
        expect(Number(vakt.timer)).toBeGreaterThan(0);
        expect(Number(vakt.timer)).toBeLessThanOrEqual(13);
      }
    });
  });
});
