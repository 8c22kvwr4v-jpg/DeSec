/**
 * Testrigg for sikkerhetstestene.
 *
 * Kjorer de EKTE migrasjonene og de EKTE RLS-policyene mot en lokal
 * PostgreSQL. Supabase-spesifikke deler (auth.uid, databaserollene) hentes
 * fra tests/sql/shim.sql. Testene later som de er innloggede brukere ved a
 * sette request.jwt.claims og bytte til rollen `authenticated`, nøyaktig
 * slik Supabase gjor for hver API-forespørsel.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { buildSeed } from '../../supabase/seed/dataset';

const ROOT = join(__dirname, '..', '..');

export const testDbConfig: pg.PoolConfig = {
  host: process.env.TEST_PGHOST ?? '/tmp/avero-testdb/sock',
  port: Number(process.env.TEST_PGPORT ?? 55432),
  user: process.env.TEST_PGUSER ?? 'postgres',
  database: process.env.TEST_PGDATABASE ?? 'avero_test',
};

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) pool = new pg.Pool({ ...testDbConfig, max: 4 });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

function sqlValue(value: unknown): unknown {
  return value === undefined ? null : value;
}

async function insertRows(
  client: pg.PoolClient | pg.Client,
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  for (const row of rows) {
    const columns = Object.keys(row);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    await client.query(
      `insert into public.${table} (${columns.map((c) => `"${c}"`).join(', ')}) values (${placeholders})`,
      columns.map((c) => sqlValue(row[c])),
    );
  }
}

/** Bygger databasen fra bunnen: skjema, funksjoner, RLS og testdata. */
export async function resetDatabase(): Promise<void> {
  const client = new pg.Client(testDbConfig);
  await client.connect();
  try {
    await client.query('drop schema if exists public cascade');
    await client.query('drop schema if exists auth cascade');
    await client.query('create schema public');
    await client.query('grant all on schema public to postgres');

    // Supabase-etterligning (kun for test)
    await client.query(readFileSync(join(ROOT, 'tests', 'sql', 'shim.sql'), 'utf8'));

    // De ekte migrasjonene, i rekkefølge
    const dir = join(ROOT, 'supabase', 'migrations');
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await client.query(readFileSync(join(dir, file), 'utf8'));
    }

    // Testdata
    const seed = buildSeed();
    for (const user of seed.users) {
      await client.query('insert into auth.users (id, email) values ($1, $2)', [user.id, user.email]);
    }
    for (const { table, rows } of seed.tables) {
      await insertRows(client, table, rows);
    }
    for (const update of seed.updates) {
      const columns = Object.keys(update.values);
      const assignments = columns.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
      await client.query(
        `update public.${update.table} set ${assignments} where id = $${columns.length + 1}`,
        [...columns.map((c) => update.values[c]), update.id],
      );
    }
  } finally {
    await client.end();
  }
}

export type QueryResult<T = Record<string, unknown>> = { rows: T[] };

/**
 * Kjorer en spørring som en innlogget bruker, med RLS aktiv.
 * Alt skjer i en transaksjon som rulles tilbake, slik at testene ikke
 * pavirker hverandre.
 */
export async function asUser<T = Record<string, unknown>>(
  userId: string | null,
  run: (query: (sql: string, params?: unknown[]) => Promise<QueryResult<T>>) => Promise<void>,
): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('begin');
    await client.query('select set_config($1, $2, true)', [
      'request.jwt.claims',
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    await client.query('set local role authenticated');

    // Hver spørring kjores i sitt eget savepoint. En forespørsel som blir
    // avvist skal ikke velte resten av testen.
    const query = async (sql: string, params?: unknown[]): Promise<QueryResult<T>> => {
      await client.query('savepoint steg');
      try {
        const result = await client.query(sql, params);
        await client.query('release savepoint steg');
        return result as QueryResult<T>;
      } catch (error) {
        await client.query('rollback to savepoint steg');
        throw error;
      }
    };

    await run(query);
  } finally {
    await client.query('rollback').catch(() => undefined);
    client.release();
  }
}

/**
 * Bekrefter at databasen avviser en forespørsel.
 *
 * RLS avviser pa to mater: enten kastes en feil (WITH CHECK, triggere,
 * manglende rettigheter), eller sa filtreres raden bort i USING-leddet slik
 * at ingen rader treffes. Begge deler betyr at forespørselen ble stoppet av
 * serveren, og begge regnes derfor som avvist.
 */
export async function expectDenied(
  promise: Promise<unknown>,
): Promise<{ denied: boolean; message: string }> {
  try {
    const result = (await promise) as { rowCount?: number | null };
    if (typeof result?.rowCount === 'number' && result.rowCount === 0) {
      return { denied: true, message: 'ingen rader ble truffet (avvist av RLS)' };
    }
    return { denied: false, message: 'forespørselen ble tillatt' };
  } catch (error) {
    return { denied: true, message: (error as Error).message };
  }
}
