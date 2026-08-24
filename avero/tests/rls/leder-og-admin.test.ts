/**
 * Sikkerhetstester for operativ leder og administrator.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { asUser, closePool, expectDenied } from '../setup/db';
import { seedIds } from '../../supabase/seed/dataset';

const { users, sites, reports, journals, instructions } = seedIds;

afterAll(closePool);

describe('Operativ leder – begrenset ansvarsomrade', () => {
  it('ser bare ansatte innenfor tildelt avdeling eller objekt', async () => {
    await asUser(users.leder, async (query) => {
      const synlige = await query('select id, first_name from profiles');
      const ider = synlige.rows.map((r) => r.id);

      // Avdeling "Stasjonær vakt" er tildelt lederen.
      expect(ider).toContain(users.sara);
      expect(ider).toContain(users.tobias);
      expect(ider).toContain(users.aisha);
      // Petter har tilgang til Vestland Terminal Nord, som ogsa er tildelt.
      expect(ider).toContain(users.petter);
      // Arrangementsavdelingen er ikke tildelt lederen.
      expect(ider).not.toContain(users.nina);
      expect(ider).not.toContain(users.david);
    });
  });

  it('ser bare objekter innenfor ansvarsomradet', async () => {
    await asUser(users.leder, async (query) => {
      const synlige = await query('select id from sites');
      const ider = synlige.rows.map((r) => r.id);
      expect(ider).toContain(sites.kontorpark);     // avdeling stasjonær
      expect(ider).toContain(sites.terminalNord);   // direkte tildelt objekt
      expect(ider).not.toContain(sites.terminalSor); // arrangement
    });
  });

  it('ser ikke rapporter utenfor ansvarsomradet', async () => {
    await asUser(users.leder, async (query) => {
      const tilgjengelig = await query('select id from reports');
      const ider = tilgjengelig.rows.map((r) => r.id);
      expect(ider).toContain(reports.tobiasHendelse);   // terminal nord
      expect(ider).not.toContain(reports.ninaVaktrapport); // arrangement
    });
  });

  it('kan behandle en rapport innenfor ansvarsomradet', async () => {
    await asUser(users.leder, async (query) => {
      const endret = await query(
        `update reports set status = 'under_behandling', handler_id = $1,
                handling_note = 'Vurderes sammen med kunde'
           where id = $2`,
        [users.leder, reports.tobiasHendelse],
      );
      expect((endret as unknown as { rowCount: number }).rowCount).toBe(1);
    });
  });

  it('kan ikke opprette eller endre vakter', async () => {
    await asUser(users.leder, async (query) => {
      const endret = await query(
        `update shifts set notes = 'endret av leder' where id = $1`, [seedIds.shifts.saraPagaende],
      );
      expect((endret as unknown as { rowCount: number }).rowCount).toBe(0);
    });
  });

  it('kan ikke opprette brukere eller endre roller', async () => {
    await asUser(users.leder, async (query) => {
      const rolle = await expectDenied(query(
        `update profiles set role = 'administrator' where id = $1`, [users.sara],
      ));
      expect(rolle.denied).toBe(true);
    });
  });

  it('har ikke tilgang til revisjonsloggen', async () => {
    await asUser(users.leder, async (query) => {
      const logg = await query('select id from audit_logs');
      expect(logg.rows).toHaveLength(0);
    });
  });

  it('kan lese journalen for et objekt i ansvarsomradet', async () => {
    await asUser(users.leder, async (query) => {
      const journal = await query('select id from journals where id = $1', [journals.tobiasIgar]);
      expect(journal.rows).toHaveLength(1);
    });
  });
});

describe('Administrator – full tilgang i eget selskap', () => {
  it('ser alle ansatte', async () => {
    await asUser(users.admin, async (query) => {
      const alle = await query('select id from profiles');
      expect(alle.rows.length).toBe(9);
    });
  });

  it('ser alle vakter, rapporter og instrukser', async () => {
    await asUser(users.admin, async (query) => {
      const vakter = await query('select count(*)::int as n from shifts');
      expect(Number(vakter.rows[0].n)).toBeGreaterThan(50);

      const rapporter = await query('select count(*)::int as n from reports');
      expect(Number(rapporter.rows[0].n)).toBe(7);

      const instrukser = await query('select count(*)::int as n from instructions');
      expect(Number(instrukser.rows[0].n)).toBe(6);
    });
  });

  it('kan opprette vakt og tildele den til en ansatt', async () => {
    await asUser(users.admin, async (query) => {
      const vakt = await query(
        `insert into shifts (company_id, site_id, starts_at, ends_at, status, shift_type)
         values ($1, $2, now() + interval '3 days', now() + interval '3 days' + interval '8 hours',
                 'tildelt', 'stasjonaer')
         returning id`,
        [seedIds.company, sites.kontorpark],
      );
      const vaktId = vakt.rows[0].id as string;

      const tildeling = await query(
        `insert into shift_assignments (company_id, shift_id, employee_id, status, assigned_by)
         values ($1, $2, $3, 'tildelt', $4) returning id`,
        [seedIds.company, vaktId, users.nina, users.admin],
      );
      expect(tildeling.rows).toHaveLength(1);
    });
  });

  it('kan tildele en instruks til en enkelt ansatt', async () => {
    await asUser(users.admin, async (query) => {
      const tildeling = await query(
        `insert into instruction_assignments
           (company_id, instruction_id, profile_id, assigned_by, valid_from)
         values ($1, $2, $3, $4, current_date) returning id`,
        [seedIds.company, instructions.nattlasing, users.sara, users.admin],
      );
      expect(tildeling.rows).toHaveLength(1);

      // Etter tildelingen ser Sara instruksen - men forst na.
      const synlig = await query(
        'select public.has_instruction_access($1) as tilgang', [instructions.nattlasing],
      );
      expect(synlig.rows[0].tilgang).toBe(false); // administrator har ikke egen tildeling
    });
  });

  it('leser revisjonsloggen', async () => {
    await asUser(users.admin, async (query) => {
      const logg = await query('select count(*)::int as n from audit_logs');
      expect(Number(logg.rows[0].n)).toBeGreaterThan(0);
    });
  });

  it('kan deaktivere en bruker', async () => {
    await asUser(users.admin, async (query) => {
      const endret = await query(
        'update profiles set is_active = false, deactivated_at = now() where id = $1',
        [users.david],
      );
      expect((endret as unknown as { rowCount: number }).rowCount).toBe(1);
    });
  });
});
