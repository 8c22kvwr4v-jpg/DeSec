import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import type { Tone } from '@/lib/etiketter';

/* =====================================================================
   Gjenbrukbare byggeklosser. Alle trykkflater er minst 44 px høye, slik
   at de er enkle a treffe pa mobil.
   ===================================================================== */

const toneKlasser: Record<Tone, string> = {
  nøytral: 'bg-marine-800 text-tekst-dempet ring-linje',
  aktiv: 'bg-aksent/15 text-aksent-lys ring-aksent/40',
  positiv: 'bg-positiv/15 text-positiv ring-positiv/30',
  advarsel: 'bg-advarsel/15 text-advarsel ring-advarsel/30',
  kritisk: 'bg-kritisk/15 text-kritisk ring-kritisk/30',
  aksent: 'bg-aksent/20 text-aksent-lys ring-aksent/40',
};

export function Merkelapp({
  tone = 'nøytral', children, className = '',
}: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${toneKlasser[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Kort({
  children, className = '', ...rest
}: { children: ReactNode; className?: string } & ComponentProps<'div'>) {
  return (
    <div
      className={`rounded-2xl bg-marine-900/80 ring-1 ring-linje/80 backdrop-blur-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Seksjon({
  tittel, beskrivelse, handling, children, className = '',
}: {
  tittel?: ReactNode; beskrivelse?: ReactNode; handling?: ReactNode;
  children: ReactNode; className?: string;
}) {
  return (
    <section className={`space-y-3 ${className}`}>
      {(tittel || handling) && (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {tittel && <h2 className="text-lg font-semibold text-tekst">{tittel}</h2>}
            {beskrivelse && <p className="mt-0.5 text-sm text-tekst-dempet">{beskrivelse}</p>}
          </div>
          {handling}
        </div>
      )}
      {children}
    </section>
  );
}

const knappKlasser = {
  primær: 'bg-aksent text-white hover:bg-aksent-mork active:bg-aksent-mork',
  sekundær: 'bg-marine-700 text-tekst hover:bg-marine-600 ring-1 ring-linje',
  dempet: 'bg-transparent text-tekst-dempet hover:bg-marine-800 hover:text-tekst',
  fare: 'bg-kritisk/20 text-kritisk ring-1 ring-kritisk/40 hover:bg-kritisk/30',
} as const;

const størrelseKlasser = {
  normal: 'min-h-12 px-4 text-sm',
  stor: 'min-h-14 px-5 text-base',
  liten: 'min-h-10 px-3 text-sm',
} as const;

type KnappStil = {
  variant?: keyof typeof knappKlasser;
  størrelse?: keyof typeof størrelseKlasser;
  bred?: boolean;
};

function knappStil({ variant = 'primær', størrelse = 'normal', bred }: KnappStil, ekstra = '') {
  return [
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
    'transition-colors disabled:opacity-50 disabled:pointer-events-none',
    knappKlasser[variant], størrelseKlasser[størrelse], bred ? 'w-full' : '', ekstra,
  ].join(' ');
}

export function Knapp({
  variant, størrelse, bred, className = '', children, ...rest
}: KnappStil & ComponentProps<'button'>) {
  return (
    <button className={knappStil({ variant, størrelse, bred }, className)} {...rest}>
      {children}
    </button>
  );
}

export function Lenkeknapp({
  variant, størrelse, bred, className = '', children, ...rest
}: KnappStil & ComponentProps<typeof Link>) {
  return (
    <Link className={knappStil({ variant, størrelse, bred }, className)} {...rest}>
      {children}
    </Link>
  );
}

export function TomTilstand({
  ikon, tittel, tekst, handling,
}: { ikon?: ReactNode; tittel: string; tekst?: string; handling?: ReactNode }) {
  return (
    <Kort className="px-5 py-10 text-center">
      {ikon && <div className="mx-auto mb-3 text-tekst-svak">{ikon}</div>}
      <p className="font-medium text-tekst">{tittel}</p>
      {tekst && <p className="mx-auto mt-1 max-w-sm text-sm text-tekst-dempet">{tekst}</p>}
      {handling && <div className="mt-5 flex justify-center">{handling}</div>}
    </Kort>
  );
}

export function Etikettverdi({
  etikett, children, className = '',
}: { etikett: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium uppercase tracking-wider text-tekst-svak">{etikett}</dt>
      <dd className="mt-1 text-sm text-tekst break-words">{children}</dd>
    </div>
  );
}

export function Skillelinje({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-linje/70 ${className}`} />;
}

/** Melding om at noe gikk galt eller ble avvist. */
export function Beskjed({
  tone = 'kritisk', children,
}: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role="status"
      className={`rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${toneKlasser[tone]}`}
    >
      {children}
    </div>
  );
}
