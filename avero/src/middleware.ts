import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Fornyer sesjonen og stenger appen for uinnloggede.
 *
 * Middleware er forsteforsvaret i grensesnittet. Selve datatilgangen
 * handheves uansett av Row Level Security i databasen.
 */
const OFFENTLIGE_STIER = ['/logg-inn', '/glemt-passord', '/nytt-passord', '/auth'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Uten oppsett lar vi forespørselen ga videre; sidene viser da en
  // tydelig melding om manglende miljøvariabler.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const sti = request.nextUrl.pathname;
  const erOffentlig = OFFENTLIGE_STIER.some((p) => sti === p || sti.startsWith(`${p}/`));

  if (!user && !erOffentlig) {
    const målside = request.nextUrl.clone();
    målside.pathname = '/logg-inn';
    målside.searchParams.set('retur', sti);
    return NextResponse.redirect(målside);
  }

  if (user && (sti === '/logg-inn' || sti === '/')) {
    const målside = request.nextUrl.clone();
    målside.pathname = '/start';
    målside.search = '';
    return NextResponse.redirect(målside);
  }

  return response;
}

export const config = {
  matcher: [
    // Alt unntatt statiske filer og bilder
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
