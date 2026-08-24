/**
 * Dato- og klokkeslettshandtering for Avero Sikkerhet.
 *
 * Alt vises i norsk tid (Europe/Oslo) med 24-timers klokke, uavhengig av
 * hvilken tidssone serveren eller mobilen star i. Vakter lagres som
 * timestamptz, slik at en vakt som gar over midnatt - eller over en
 * sommertidsovergang - fortsatt regnes riktig.
 */

export const OSLO_TZ = 'Europe/Oslo';

const UKEDAGER = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'];
const UKEDAGER_KORT = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];
const MANEDER = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

export type OsloParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  /** 1 = mandag ... 7 = søndag */
  weekday: number;
};

const partsFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: OSLO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Bryter et tidspunkt ned i norske kalenderfelter. */
export function osloParts(value: Date | string | number): OsloParts {
  const date = toDate(value);
  // sv-SE gir formatet "2026-08-24 22:00:00", som er trivielt a lese.
  const [datePart, timePart] = partsFormatter.format(date).split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  // Ukedag regnes ut fra kalenderdatoen, ikke fra serverens tidssone.
  const utcMidnight = Date.UTC(year, month - 1, day);
  const jsWeekday = new Date(utcMidnight).getUTCDay(); // 0 = søndag
  return { year, month, day, hour, minute, weekday: jsWeekday === 0 ? 7 : jsWeekday };
}

/** Tidssoneforskjellen mot UTC i minutter for et gitt tidspunkt. */
function osloOffsetMinutes(utcMillis: number): number {
  const p = osloParts(new Date(utcMillis));
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const rounded = Math.floor(utcMillis / 60000) * 60000;
  return (asUtc - rounded) / 60000;
}

/**
 * Lager et tidspunkt ut fra norsk lokaltid. Beregningen gjores to ganger
 * slik at den treffer riktig ogsa rundt overgangen til og fra sommertid.
 */
export function osloTime(
  year: number, month: number, day: number, hour = 0, minute = 0,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let offset = osloOffsetMinutes(naive);
  let result = naive - offset * 60000;
  offset = osloOffsetMinutes(result);
  result = naive - offset * 60000;
  return new Date(result);
}

/** Mandag kl. 00:00 norsk tid i uken tidspunktet tilhorer. */
export function startOfWeek(value: Date | string | number): Date {
  const p = osloParts(value);
  const monday = osloTime(p.year, p.month, p.day, 0, 0);
  return new Date(monday.getTime() - (p.weekday - 1) * 86400000);
}

export function addDays(value: Date | string | number, days: number): Date {
  const p = osloParts(value);
  const base = osloTime(p.year, p.month, p.day, p.hour, p.minute);
  // Gar veien om kalenderdato slik at et dogn forblir et dogn ogsa nar
  // klokken stilles.
  const target = new Date(base.getTime() + days * 86400000);
  const tp = osloParts(target);
  return osloTime(tp.year, tp.month, tp.day, p.hour, p.minute);
}

export function addWeeks(value: Date | string | number, weeks: number): Date {
  return addDays(value, weeks * 7);
}

/** ISO-8601 ukenummer (uke 1 er uken med arets forste torsdag). */
export function isoWeekNumber(value: Date | string | number): number {
  const p = osloParts(value);
  const thursday = new Date(Date.UTC(p.year, p.month - 1, p.day) + (4 - p.weekday) * 86400000);
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - yearStart) / 86400000 + 1) / 7);
}

export function isoWeekYear(value: Date | string | number): number {
  const p = osloParts(value);
  const thursday = new Date(Date.UTC(p.year, p.month - 1, p.day) + (4 - p.weekday) * 86400000);
  return thursday.getUTCFullYear();
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 24.08.2026 */
export function formatDate(value: Date | string | number): string {
  const p = osloParts(value);
  return `${pad(p.day)}.${pad(p.month)}.${p.year}`;
}

/** man 24.08 */
export function formatDateShort(value: Date | string | number): string {
  const p = osloParts(value);
  return `${UKEDAGER_KORT[p.weekday - 1]} ${pad(p.day)}.${pad(p.month)}`;
}

/** mandag 24. august 2026 */
export function formatDateLong(value: Date | string | number): string {
  const p = osloParts(value);
  return `${UKEDAGER[p.weekday - 1]} ${p.day}. ${MANEDER[p.month - 1]} ${p.year}`;
}

/** 22:00 */
export function formatTime(value: Date | string | number): string {
  const p = osloParts(value);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** 24.08.2026 22:00 */
export function formatDateTime(value: Date | string | number): string {
  return `${formatDate(value)} ${formatTime(value)}`;
}

/** Verdi til <input type="datetime-local"> i norsk tid. */
export function toLocalInputValue(value: Date | string | number): string {
  const p = osloParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Leser <input type="datetime-local"> som norsk tid. */
export function fromLocalInputValue(value: string): Date {
  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return osloTime(year, month, day, hour, minute);
}

export function toDateInputValue(value: Date | string | number): string {
  const p = osloParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Samme kalenderdag i norsk tid? */
export function isSameOsloDay(a: Date | string | number, b: Date | string | number): boolean {
  const pa = osloParts(a);
  const pb = osloParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** Gar vakten over midnatt? */
export function crossesMidnight(
  start: Date | string | number, end: Date | string | number,
): boolean {
  return !isSameOsloDay(start, end);
}

/** Lengde i timer, avrundet til én desimal. */
export function durationHours(
  start: Date | string | number, end: Date | string | number,
): number {
  const ms = toDate(end).getTime() - toDate(start).getTime();
  return Math.round((ms / 3600000) * 10) / 10;
}

/** "8,5 t" */
export function formatDuration(
  start: Date | string | number, end: Date | string | number,
): string {
  const hours = durationHours(start, end);
  return `${String(hours).replace('.', ',')} t`;
}

/**
 * "22:00–06:00 (+1)" for vakter som gar over midnatt, ellers "07:00–19:00".
 */
export function formatShiftTime(
  start: Date | string | number, end: Date | string | number,
): string {
  const base = `${formatTime(start)}–${formatTime(end)}`;
  return crossesMidnight(start, end) ? `${base} (+1)` : base;
}

/** Er vakten i gang na? */
export function isOngoing(
  start: Date | string | number, end: Date | string | number, now: Date = new Date(),
): boolean {
  return toDate(start).getTime() <= now.getTime() && now.getTime() <= toDate(end).getTime();
}

/** "om 3 t 20 min" / "for 2 dager siden" */
export function relativeTime(value: Date | string | number, now: Date = new Date()): string {
  const diff = toDate(value).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let text: string;
  if (minutes < 1) text = 'nå';
  else if (minutes < 60) text = `${minutes} min`;
  else if (hours < 24) text = `${hours} t${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
  else if (days < 7) text = `${days} ${days === 1 ? 'dag' : 'dager'}`;
  else text = `${Math.floor(days / 7)} ${Math.floor(days / 7) === 1 ? 'uke' : 'uker'}`;

  if (text === 'nå') return 'nå';
  return diff >= 0 ? `om ${text}` : `for ${text} siden`;
}

/** Dagene i uken som starter på gitt mandag. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "Uke 35 · 24.08–30.08.2026" */
export function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const ps = osloParts(weekStart);
  const pe = osloParts(end);
  return `Uke ${isoWeekNumber(weekStart)} · ${pad(ps.day)}.${pad(ps.month)}–${pad(pe.day)}.${pad(pe.month)}.${pe.year}`;
}
