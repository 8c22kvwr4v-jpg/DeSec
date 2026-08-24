import Link from 'next/link';
import { Building2, Clock3, MapPin } from 'lucide-react';
import { Merkelapp } from '@/components/ui';
import {
  formatDateLong, formatDateShort, formatDuration, formatShiftTime, isOngoing,
} from '@/lib/dates';
import { vaktstatusNavn, vaktstatusTone, vakttypeNavn } from '@/lib/etiketter';
import type { VaktVisning } from '@/server/data/vakter';

/** Ett kort per vakt, brukt bade pa startsiden og i «Mine vakter». */
export function Vaktkort({
  visning, href, visDato = true,
}: { visning: VaktVisning; href?: string; visDato?: boolean }) {
  const { vakt, objekt, kunde } = visning;
  const pagar = isOngoing(vakt.starts_at, vakt.ends_at);

  const innhold = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {visDato && (
            <p className="text-sm font-semibold text-tekst">
              {formatDateLong(vakt.starts_at)}
            </p>
          )}
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-tekst-dempet">
            <Clock3 className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span className="font-medium text-tekst">
              {formatShiftTime(vakt.starts_at, vakt.ends_at)}
            </span>
            <span className="text-tekst-svak">·</span>
            <span>{formatDuration(vakt.starts_at, vakt.ends_at)}</span>
          </p>
        </div>
        <Merkelapp tone={pagar ? 'aktiv' : vaktstatusTone[vakt.status]}>
          {pagar && vakt.status !== 'avlyst' ? 'Pågår nå' : vaktstatusNavn[vakt.status]}
        </Merkelapp>
      </div>

      <div className="mt-3 space-y-1 text-sm">
        <p className="flex items-center gap-1.5 text-tekst">
          <Building2 className="h-4 w-4 shrink-0 text-tekst-svak" strokeWidth={1.8} />
          <span className="truncate">{objekt?.name ?? 'Objekt ikke tilgjengelig'}</span>
        </p>
        {kunde && (
          <p className="flex items-center gap-1.5 text-tekst-dempet">
            <MapPin className="h-4 w-4 shrink-0 text-tekst-svak" strokeWidth={1.8} />
            <span className="truncate">{kunde.name}</span>
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Merkelapp>{vakttypeNavn[vakt.shift_type]}</Merkelapp>
        {vakt.meeting_point && (
          <span className="truncate text-xs text-tekst-svak">
            Oppmøte: {vakt.meeting_point}
          </span>
        )}
      </div>
    </>
  );

  const klasser =
    'block rounded-2xl bg-marine-900/80 p-4 ring-1 ring-linje/80 transition-colors';

  if (!href) return <div className={klasser}>{innhold}</div>;

  return (
    <Link href={href} className={`${klasser} hover:bg-marine-800 active:bg-marine-800`}>
      {innhold}
    </Link>
  );
}

/** Kompakt rad for ukevisningen. */
export function Vaktrad({ visning, href }: { visning: VaktVisning; href: string }) {
  const { vakt, objekt } = visning;
  const pagar = isOngoing(vakt.starts_at, vakt.ends_at);

  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-3 rounded-xl bg-marine-900/70 px-3 py-2.5 ring-1 ring-linje/70 hover:bg-marine-800"
    >
      <div className="w-16 shrink-0 text-center">
        <p className="text-[0.7rem] uppercase tracking-wide text-tekst-svak">
          {formatDateShort(vakt.starts_at).split(' ')[0]}
        </p>
        <p className="text-sm font-semibold text-tekst">
          {formatDateShort(vakt.starts_at).split(' ')[1]}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-tekst">
          {formatShiftTime(vakt.starts_at, vakt.ends_at)}
        </p>
        <p className="truncate text-xs text-tekst-dempet">
          {objekt?.name ?? 'Objekt'} · {vakttypeNavn[vakt.shift_type]}
        </p>
      </div>
      <Merkelapp tone={pagar ? 'aktiv' : vaktstatusTone[vakt.status]} className="shrink-0">
        {pagar ? 'Pågår' : vaktstatusNavn[vakt.status]}
      </Merkelapp>
    </Link>
  );
}
