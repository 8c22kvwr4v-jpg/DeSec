/**
 * Setter sammen migrasjonene til én fil som kan limes rett inn i
 * SQL-editoren i Supabase.
 *
 *   npm run sql:samle
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const katalog = join(process.cwd(), 'supabase', 'migrations');
const filer = readdirSync(katalog).filter((f) => f.endsWith('.sql')).sort();

const deler = [
  '-- =====================================================================',
  '-- Avero Sikkerhet - komplett databaseoppsett',
  '--',
  '-- Lim hele denne filen inn i SQL Editor i Supabase og kjor den.',
  '-- Filen kan kjores flere ganger uten a odelegge data.',
  '--',
  '-- Generert av: npm run sql:samle',
  '-- Kilde: supabase/migrations/',
  '-- =====================================================================',
  '',
];

for (const fil of filer) {
  deler.push(
    '',
    `-- ---------------------------------------------------------------------`,
    `-- ${fil}`,
    `-- ---------------------------------------------------------------------`,
    '',
    readFileSync(join(katalog, fil), 'utf8').trim(),
    '',
  );
}

const mal = join(process.cwd(), 'supabase', 'full-oppsett.sql');
writeFileSync(mal, `${deler.join('\n')}\n`);
console.log(`Skrev ${mal} (${filer.length} migrasjoner)`);
