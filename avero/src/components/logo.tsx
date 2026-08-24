/**
 * Midlertidig tekstlogo. Byttes ut nar den ekte logoen lastes opp
 * (se README, avsnittet «Logo»).
 */
export function Logo({ størrelse = 'normal' }: { størrelse?: 'liten' | 'normal' | 'stor' }) {
  const tekst = {
    liten: { navn: 'text-sm', under: 'text-[0.55rem]', merke: 'h-7 w-7' },
    normal: { navn: 'text-base', under: 'text-[0.6rem]', merke: 'h-9 w-9' },
    stor: { navn: 'text-2xl', under: 'text-[0.7rem]', merke: 'h-12 w-12' },
  }[størrelse];

  return (
    <span className="flex items-center gap-3">
      <span
        aria-hidden
        className={`${tekst.merke} shrink-0 rounded-xl bg-marine-800 ring-1 ring-linje grid place-items-center`}
      >
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" role="presentation">
          <path d="M12 3 2.5 20h5.2L12 12.2 16.3 20h5.2L12 3Z" fill="var(--color-aksent)" />
          <path d="M12 3 7.7 20h4.3V3Z" fill="var(--color-aksent-lys)" opacity=".55" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className={`${tekst.navn} font-semibold tracking-[0.14em] text-tekst`}>AVERO</span>
        <span className={`${tekst.under} font-medium tracking-[0.34em] text-tekst-svak`}>
          SIKKERHET
        </span>
      </span>
    </span>
  );
}
