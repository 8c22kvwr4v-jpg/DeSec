import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Tar imot lenken fra e-post (nytt passord / bekreftelse). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const kode = searchParams.get('code');
  const neste = searchParams.get('neste') ?? '/start';

  if (kode) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(kode);
    if (!error) {
      return NextResponse.redirect(`${origin}${neste.startsWith('/') ? neste : '/start'}`);
    }
  }

  return NextResponse.redirect(`${origin}/logg-inn?feil=lenke`);
}
