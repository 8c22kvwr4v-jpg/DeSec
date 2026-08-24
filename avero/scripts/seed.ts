/**
 * Legger inn fiktive testdata i et Supabase-prosjekt.
 *
 *   npm run seed
 *
 * Krever NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY i .env.local.
 * Skriptet er idempotent - det kan kjores flere ganger.
 *
 * ADVARSEL: skriptet oppretter brukere med kjente passord. Bruk det bare
 * i test- og demomiljøer, aldri mot en produksjonsdatabase.
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { buildSeed, DEMO_PASSWORD } from '../supabase/seed/dataset';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  console.error(
    'Mangler NEXT_PUBLIC_SUPABASE_URL og/eller SUPABASE_SERVICE_ROLE_KEY.\n'
    + 'Kopier .env.example til .env.local og fyll inn verdiene.',
  );
  process.exit(1);
}

if (url.includes('supabase.co') && process.env.TILLAT_SEED_MOT_SKY !== 'ja') {
  console.warn(
    '\nDu er i ferd med a legge testdata inn i et Supabase-prosjekt i skyen.\n'
    + 'Kjor med TILLAT_SEED_MOT_SKY=ja hvis dette er riktig prosjekt.\n',
  );
  process.exit(1);
}

const klient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function opprettBrukere(brukere: ReturnType<typeof buildSeed>['users']) {
  const { data: eksisterende } = await klient.auth.admin.listUsers({ perPage: 1000 });
  const eposter = new Map((eksisterende?.users ?? []).map((u) => [u.email, u.id]));

  for (const bruker of brukere) {
    if (eposter.has(bruker.email)) {
      console.log(`  · ${bruker.email} finnes fra for`);
      continue;
    }
    const { error } = await klient.auth.admin.createUser({
      id: bruker.id,
      email: bruker.email,
      password: bruker.password,
      email_confirm: true,
    });
    if (error) throw new Error(`Kunne ikke opprette ${bruker.email}: ${error.message}`);
    console.log(`  · ${bruker.email} opprettet`);
  }
}

async function main() {
  console.log('Legger inn testdata for Avero Sikkerhet …\n');

  const seed = buildSeed();

  console.log('Paloggingsbrukere:');
  await opprettBrukere(seed.users);

  console.log('\nTabeller:');
  for (const { table, rows } of seed.tables) {
    const { error } = await klient
      .from(table)
      .upsert(rows as never[], { onConflict: 'id', ignoreDuplicates: false });
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`  · ${table}: ${rows.length} rader`);
  }

  console.log('\nEtterarbeid:');
  for (const oppdatering of seed.updates) {
    const { error } = await klient
      .from(oppdatering.table)
      .update(oppdatering.values as never)
      .eq('id', oppdatering.id);
    if (error) throw new Error(`${oppdatering.table}: ${error.message}`);
    console.log(`  · ${oppdatering.table} oppdatert (utloser ny versjon)`);
  }

  console.log('\nFerdig. Demobrukere (passord: ' + DEMO_PASSWORD + '):');
  for (const bruker of seed.users) {
    console.log(`  ${bruker.role.padEnd(15)} ${bruker.email}`);
  }
}

main().catch((feil) => {
  console.error('\nFeil under innlegging av testdata:', feil.message);
  process.exit(1);
});
