/**
 * Miljøvariabler. Hemmeligheter leses kun pa serveren - service-nokkelen
 * skal aldri sendes til nettleseren.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Miljøvariabelen ${name} mangler. Kopier .env.example til .env.local og fyll inn verdiene.`,
    );
  }
  return value;
}

export const supabaseUrl = (): string =>
  required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabaseAnonKey = (): string =>
  required(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

/** Kun for serverkode: seeding og administrasjon av brukere. */
export const supabaseServiceKey = (): string =>
  required(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  );

export const appUrl = (): string =>
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
