'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Laster opp bilder til en privat lagringsbøtte.
 *
 * Filene lastes opp direkte fra nettleseren med brukerens egen sesjon.
 * Lagringsreglene i databasen bestemmer hvilken mappe brukeren far skrive
 * til, og filene kan bare hentes ned igjen via signerte lenker.
 */
export function Bildeopplasting({
  bøtte, mappe, navn = 'vedlegg', maksAntall = 6,
}: { bøtte: string; mappe: string; navn?: string; maksAntall?: number }) {
  const [filer, setFiler] = useState<{ sti: string; navn: string }[]>([]);
  const [laster, setLaster] = useState(false);
  const [feil, setFeil] = useState<string | null>(null);
  const filfelt = useRef<HTMLInputElement>(null);

  async function velgFiler(valgte: FileList | null) {
    if (!valgte?.length) return;
    setFeil(null);
    setLaster(true);
    const klient = createClient();
    const nye: { sti: string; navn: string }[] = [];

    try {
      for (const fil of Array.from(valgte).slice(0, maksAntall - filer.length)) {
        if (fil.size > 10 * 1024 * 1024) {
          setFeil('Bilder kan være inntil 10 MB.');
          continue;
        }
        const endelse = fil.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const sti = `${mappe}/${crypto.randomUUID()}.${endelse}`;
        const { error } = await klient.storage.from(bøtte).upload(sti, fil, {
          cacheControl: '3600', upsert: false,
        });
        if (error) {
          setFeil('Opplastingen ble avvist. Kontroller at du har tilgang.');
        } else {
          nye.push({ sti, navn: fil.name });
        }
      }
      setFiler((forrige) => [...forrige, ...nye]);
    } finally {
      setLaster(false);
      if (filfelt.current) filfelt.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      {filer.map((fil) => (
        <span key={fil.sti}>
          <input type="hidden" name={navn} value={fil.sti} />
          <input type="hidden" name={`${navn}Navn`} value={fil.navn} />
        </span>
      ))}

      <button
        type="button"
        onClick={() => filfelt.current?.click()}
        disabled={laster || filer.length >= maksAntall}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-marine-800 text-sm font-semibold text-tekst ring-1 ring-linje hover:bg-marine-700 disabled:opacity-50"
      >
        {laster
          ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
          : <ImagePlus className="h-5 w-5" strokeWidth={2} />}
        {laster ? 'Laster opp …' : 'Legg ved bilde'}
      </button>

      <input
        ref={filfelt}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(e) => velgFiler(e.target.files)}
      />

      {feil && <p className="text-xs text-kritisk">{feil}</p>}

      {filer.length > 0 && (
        <ul className="space-y-1">
          {filer.map((fil) => (
            <li
              key={fil.sti}
              className="flex items-center gap-2 rounded-lg bg-marine-900 px-3 py-2 text-xs text-tekst-dempet ring-1 ring-linje"
            >
              <span className="min-w-0 flex-1 truncate">{fil.navn}</span>
              <button
                type="button"
                aria-label="Fjern bilde"
                onClick={() => setFiler((f) => f.filter((v) => v.sti !== fil.sti))}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tekst-svak hover:bg-marine-800 hover:text-tekst"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
