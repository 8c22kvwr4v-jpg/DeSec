'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell, Building2, CalendarDays, ClipboardCheck, ClipboardList, Download, FileText,
  GraduationCap, History, Home, LayoutDashboard, MoreHorizontal, ScrollText, Users,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type Menypunkt = {
  navn: string;
  kortNavn?: string;
  sti: string;
  ikon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Vises bare i sidemenyen pa PC, ikke i bunnmenyen pa mobil. */
  kunPc?: boolean;
};

export const ansattMeny: Menypunkt[] = [
  { navn: 'Hjem', sti: '/hjem', ikon: Home },
  { navn: 'Mine vakter', kortNavn: 'Vakter', sti: '/vakter', ikon: CalendarDays },
  { navn: 'Mine instrukser', kortNavn: 'Instrukser', sti: '/instrukser', ikon: ClipboardList },
  { navn: 'Rapporter', sti: '/rapporter', ikon: FileText },
  { navn: 'Ledige vakter', sti: '/ledige-vakter', ikon: ClipboardCheck, kunPc: true },
  { navn: 'Kurs og godkjenninger', kortNavn: 'Kurs', sti: '/kurs', ikon: GraduationCap, kunPc: true },
  { navn: 'Varslinger', kortNavn: 'Varsler', sti: '/varsler', ikon: Bell, kunPc: true },
];

export const adminMeny: Menypunkt[] = [
  { navn: 'Oversikt', sti: '/admin', ikon: LayoutDashboard },
  { navn: 'Vakter og turnus', kortNavn: 'Vakter', sti: '/admin/vakter', ikon: CalendarDays },
  { navn: 'Ansatte', sti: '/admin/ansatte', ikon: Users },
  { navn: 'Rapporter', sti: '/admin/rapporter', ikon: FileText },
  { navn: 'Kunder og objekter', kortNavn: 'Objekter', sti: '/admin/objekter', ikon: Building2, kunPc: true },
  { navn: 'Instrukser og tilgang', kortNavn: 'Instrukser', sti: '/admin/instrukser', ikon: ScrollText, kunPc: true },
  { navn: 'Kurs og kompetanse', kortNavn: 'Kurs', sti: '/admin/kurs', ikon: GraduationCap, kunPc: true },
  { navn: 'Varslinger', kortNavn: 'Varsler', sti: '/admin/varsler', ikon: Bell, kunPc: true },
  { navn: 'Revisjonslogg', kortNavn: 'Logg', sti: '/admin/revisjonslogg', ikon: History, kunPc: true },
  { navn: 'Eksport', sti: '/admin/eksport', ikon: Download, kunPc: true },
];

function erAktiv(sti: string, gjeldende: string): boolean {
  if (sti === '/admin' || sti === '/hjem') return gjeldende === sti;
  return gjeldende === sti || gjeldende.startsWith(`${sti}/`);
}

/** Sidemeny for PC og nettbrett. */
export function Sidemeny({ punkter }: { punkter: Menypunkt[] }) {
  const gjeldende = usePathname();
  return (
    <nav aria-label="Hovedmeny" className="space-y-1">
      {punkter.map(({ navn, sti, ikon: Ikon }) => {
        const aktiv = erAktiv(sti, gjeldende);
        return (
          <Link
            key={sti}
            href={sti}
            aria-current={aktiv ? 'page' : undefined}
            className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
              aktiv
                ? 'bg-aksent/15 text-aksent-lys ring-1 ring-inset ring-aksent/30'
                : 'text-tekst-dempet hover:bg-marine-800 hover:text-tekst'
            }`}
          >
            <Ikon className="h-5 w-5 shrink-0" strokeWidth={aktiv ? 2.2 : 1.8} />
            <span className="truncate">{navn}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Fast bunnmeny pa mobil. */
export function Bunnmeny({ punkter, merSti }: { punkter: Menypunkt[]; merSti: string }) {
  const gjeldende = usePathname();
  const synlige = punkter.filter((p) => !p.kunPc).slice(0, 4);
  const merAktiv = !synlige.some((p) => erAktiv(p.sti, gjeldende));

  return (
    <nav
      aria-label="Hovedmeny"
      className="bunnmeny fixed inset-x-0 bottom-0 z-40 border-t border-linje bg-natt-2/95 backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {synlige.map(({ navn, kortNavn, sti, ikon: Ikon }) => {
          const aktiv = erAktiv(sti, gjeldende);
          return (
            <li key={sti}>
              <Link
                href={sti}
                aria-current={aktiv ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.68rem] font-medium ${
                  aktiv ? 'text-aksent-lys' : 'text-tekst-svak'
                }`}
              >
                <Ikon className="h-6 w-6" strokeWidth={aktiv ? 2.3 : 1.8} />
                <span className="truncate">{kortNavn ?? navn}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href={merSti}
            aria-current={merAktiv ? 'page' : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[0.68rem] font-medium ${
              merAktiv ? 'text-aksent-lys' : 'text-tekst-svak'
            }`}
          >
            <MoreHorizontal className="h-6 w-6" strokeWidth={merAktiv ? 2.3 : 1.8} />
            <span>Mer</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
