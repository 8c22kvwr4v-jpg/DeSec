/**
 * Sikkerhetstester for selskapsskille og deaktiverte brukere.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { closePool, getPool } from '../setup/db';
import { seedIds } from '../../supabase/seed/dataset';

const ANNET_SELSKAP = 'aa000000-0000-4000-8000-0000000000ff';
const ANNEN_BRUKER = 'bb000000-0000-4000-8000-0000000000ff';

afterAll(closePool);

/** Kjorer en test i en transaksjon som alltid rulles tilbake. */
async function iTransaksjon(run: (client: import('pg').PoolClient) => Promise<void>) {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await run(client);
  } finally {
    await client.query('rollback').catch(() => undefined);
    client.release();
  }
}

async function bliBruker(client: import('pg').PoolClient, userId: string) {
  await client.query('select set_config($1, $2, true)', [
    'request.jwt.claims', JSON.stringify({ sub: userId, role: 'authenticated' }),
  ]);
  await client.query('set local role authenticated');
}

describe('Selskapsskille', () => {
  it('en bruker i et annet selskap ser ingenting fra Avero', async () => {
    await iTransaksjon(async (client) => {
      await client.query(
        `insert into companies (id, name) values ($1, 'Annet Vaktselskap AS')`, [ANNET_SELSKAP],
      );
      await client.query('insert into auth.users (id, email) values ($1, $2)', [
        ANNEN_BRUKER, 'leder@annet.test',
      ]);
      await client.query(
        `insert into profiles (id, company_id, first_name, last_name, email, role)
         values ($1, $2, 'Annen', 'Administrator', 'leder@annet.test', 'administrator')`,
        [ANNEN_BRUKER, ANNET_SELSKAP],
      );

      await bliBruker(client, ANNEN_BRUKER);

      for (const tabell of [
        'profiles', 'shifts', 'shift_assignments', 'sites', 'customers',
        'instructions', 'reports', 'journals', 'journal_entries',
        'qualifications', 'notifications', 'audit_logs',
      ]) {
        const treff = await client.query(
          `select count(*)::int as n from ${tabell} where company_id = $1`, [seedIds.company],
        );
        expect(Number(treff.rows[0].n), `${tabell} lekker data pa tvers av selskap`).toBe(0);
      }

      // Egen profil ser han derimot.
      const egen = await client.query('select id from profiles');
      expect(egen.rows).toHaveLength(1);
    });
  });

  it('kan ikke skrive data inn i et annet selskap', async () => {
    await iTransaksjon(async (client) => {
      await client.query(
        `insert into companies (id, name) values ($1, 'Annet Vaktselskap AS')`, [ANNET_SELSKAP],
      );
      await client.query('insert into auth.users (id, email) values ($1, $2)', [
        ANNEN_BRUKER, 'leder@annet.test',
      ]);
      await client.query(
        `insert into profiles (id, company_id, first_name, last_name, email, role)
         values ($1, $2, 'Annen', 'Administrator', 'leder@annet.test', 'administrator')`,
        [ANNEN_BRUKER, ANNET_SELSKAP],
      );
      await bliBruker(client, ANNEN_BRUKER);

      let avvist = false;
      try {
        await client.query(
          `insert into instructions (company_id, title) values ($1, 'Innsmugling')`,
          [seedIds.company],
        );
      } catch {
        avvist = true;
      }
      expect(avvist).toBe(true);
    });
  });
});

describe('Deaktivert bruker', () => {
  it('mister all tilgang med en gang', async () => {
    await iTransaksjon(async (client) => {
      await client.query(
        'update profiles set is_active = false where id = $1', [seedIds.users.sara],
      );
      await bliBruker(client, seedIds.users.sara);

      const profil = await client.query('select id from profiles');
      expect(profil.rows).toHaveLength(0);

      const vakter = await client.query('select id from shifts');
      expect(vakter.rows).toHaveLength(0);

      const instrukser = await client.query('select id from instructions');
      expect(instrukser.rows).toHaveLength(0);

      const rapporter = await client.query('select id from reports');
      expect(rapporter.rows).toHaveLength(0);
    });
  });
});

describe('Uinnlogget forespørsel', () => {
  it('gir ingen data uten gyldig sesjon', async () => {
    await iTransaksjon(async (client) => {
      await client.query('select set_config($1, $2, true)', ['request.jwt.claims', '{}']);
      await client.query('set local role authenticated');

      for (const tabell of ['profiles', 'shifts', 'reports', 'instructions', 'journals']) {
        const treff = await client.query(`select count(*)::int as n from ${tabell}`);
        expect(Number(treff.rows[0].n), `${tabell} er lesbar uten innlogging`).toBe(0);
      }
    });
  });
});
