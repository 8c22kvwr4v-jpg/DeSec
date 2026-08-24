import type { ComponentProps, ReactNode } from 'react';

const feltKlasser =
  'w-full min-h-12 rounded-xl bg-marine-900 px-3.5 text-base text-tekst ring-1 ring-inset ' +
  'ring-linje placeholder:text-tekst-svak focus:ring-2 focus:ring-aksent focus:outline-none ' +
  'disabled:opacity-60';

export function Felt({
  etikett, hjelp, feil, påkrevd, children,
}: {
  etikett: string; hjelp?: ReactNode; feil?: string; påkrevd?: boolean; children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-tekst">
        {etikett}
        {påkrevd && <span className="ml-1 text-aksent-lys" aria-hidden>*</span>}
      </span>
      {children}
      {hjelp && <span className="block text-xs text-tekst-dempet">{hjelp}</span>}
      {feil && <span className="block text-xs text-kritisk">{feil}</span>}
    </label>
  );
}

export function Tekstfelt({ className = '', ...rest }: ComponentProps<'input'>) {
  return <input className={`${feltKlasser} ${className}`} {...rest} />;
}

export function Tekstområde({ className = '', ...rest }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={`${feltKlasser} min-h-28 resize-y py-3 leading-relaxed ${className}`}
      {...rest}
    />
  );
}

export function Nedtrekk({ className = '', children, ...rest }: ComponentProps<'select'>) {
  return (
    <select className={`${feltKlasser} appearance-none pr-9 ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Avkryssing({
  etikett, beskrivelse, className = '', ...rest
}: { etikett: string; beskrivelse?: string } & ComponentProps<'input'>) {
  return (
    <label className={`flex min-h-12 items-start gap-3 rounded-xl bg-marine-900 p-3 ring-1 ring-inset ring-linje ${className}`}>
      <input
        type="checkbox"
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-linje bg-marine-800 accent-[var(--color-aksent)]"
        {...rest}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-tekst">{etikett}</span>
        {beskrivelse && <span className="block text-xs text-tekst-dempet">{beskrivelse}</span>}
      </span>
    </label>
  );
}
