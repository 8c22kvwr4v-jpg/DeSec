/**
 * Enhetstester for dato- og klokkeslettslogikken, med vekt pa vakter som
 * gar over midnatt og over overgangen til og fra sommertid.
 */
import { describe, expect, it } from 'vitest';
import {
  addDays, crossesMidnight, durationHours, formatDate, formatDateLong, formatDateShort,
  formatDuration, formatShiftTime, formatTime, formatWeekLabel, fromLocalInputValue,
  isSameOsloDay, isoWeekNumber, isOngoing, osloTime, relativeTime, startOfWeek,
  toLocalInputValue, weekDays,
} from '../../src/lib/dates';

describe('Norsk datovisning', () => {
  it('viser dato pa norsk format', () => {
    expect(formatDate(osloTime(2026, 8, 24, 22, 0))).toBe('24.08.2026');
    expect(formatDateShort(osloTime(2026, 8, 24, 22, 0))).toBe('man 24.08');
    expect(formatDateLong(osloTime(2026, 8, 24, 22, 0))).toBe('mandag 24. august 2026');
  });

  it('bruker 24-timers klokke', () => {
    expect(formatTime(osloTime(2026, 8, 24, 22, 30))).toBe('22:30');
    expect(formatTime(osloTime(2026, 8, 24, 0, 5))).toBe('00:05');
    expect(formatTime(osloTime(2026, 1, 15, 13, 0))).toBe('13:00');
  });

  it('regner ut norsk tid uavhengig av serverens tidssone', () => {
    // 24. august er sommertid i Norge (UTC+2)
    expect(osloTime(2026, 8, 24, 22, 0).toISOString()).toBe('2026-08-24T20:00:00.000Z');
    // 24. januar er normaltid (UTC+1)
    expect(osloTime(2026, 1, 24, 22, 0).toISOString()).toBe('2026-01-24T21:00:00.000Z');
  });

  it('gir riktig ukenummer', () => {
    expect(isoWeekNumber(osloTime(2026, 8, 24, 12, 0))).toBe(35);
    expect(isoWeekNumber(osloTime(2026, 1, 1, 12, 0))).toBe(1);
    expect(isoWeekNumber(osloTime(2025, 12, 29, 12, 0))).toBe(1);
  });

  it('finner mandag i uken', () => {
    const sondag = osloTime(2026, 8, 30, 23, 30);
    expect(formatDate(startOfWeek(sondag))).toBe('24.08.2026');
    expect(formatTime(startOfWeek(sondag))).toBe('00:00');
    expect(weekDays(startOfWeek(sondag)).map(formatDateShort)).toEqual([
      'man 24.08', 'tir 25.08', 'ons 26.08', 'tor 27.08', 'fre 28.08', 'lør 29.08', 'søn 30.08',
    ]);
  });

  it('merker uken med nummer og datospenn', () => {
    expect(formatWeekLabel(startOfWeek(osloTime(2026, 8, 26, 12, 0))))
      .toBe('Uke 35 · 24.08–30.08.2026');
  });
});

describe('Vakter over midnatt', () => {
  const start = osloTime(2026, 8, 24, 22, 0);
  const slutt = osloTime(2026, 8, 25, 6, 0);

  it('oppdager at vakten gar over midnatt', () => {
    expect(crossesMidnight(start, slutt)).toBe(true);
    expect(isSameOsloDay(start, slutt)).toBe(false);
  });

  it('regner ut riktig lengde', () => {
    expect(durationHours(start, slutt)).toBe(8);
    expect(formatDuration(start, slutt)).toBe('8 t');
  });

  it('markerer neste dogn i tidsvisningen', () => {
    expect(formatShiftTime(start, slutt)).toBe('22:00–06:00 (+1)');
    expect(formatShiftTime(osloTime(2026, 8, 24, 7, 0), osloTime(2026, 8, 24, 19, 0)))
      .toBe('07:00–19:00');
  });

  it('vet nar vakten pagar', () => {
    expect(isOngoing(start, slutt, osloTime(2026, 8, 25, 2, 0))).toBe(true);
    expect(isOngoing(start, slutt, osloTime(2026, 8, 25, 7, 0))).toBe(false);
    expect(isOngoing(start, slutt, osloTime(2026, 8, 24, 21, 0))).toBe(false);
  });

  it('handterer overgangen til sommertid (natt til 29. mars 2026)', () => {
    // Klokken stilles fram kl. 02:00, sa nattvakten blir en time kortere.
    const vaktStart = osloTime(2026, 3, 28, 22, 0);
    const vaktSlutt = osloTime(2026, 3, 29, 6, 0);
    expect(crossesMidnight(vaktStart, vaktSlutt)).toBe(true);
    expect(durationHours(vaktStart, vaktSlutt)).toBe(7);
    expect(formatShiftTime(vaktStart, vaktSlutt)).toBe('22:00–06:00 (+1)');
  });

  it('handterer overgangen til normaltid (natt til 25. oktober 2026)', () => {
    // Klokken stilles tilbake kl. 03:00, sa nattvakten blir en time lengre.
    const vaktStart = osloTime(2026, 10, 24, 22, 0);
    const vaktSlutt = osloTime(2026, 10, 25, 6, 0);
    expect(durationHours(vaktStart, vaktSlutt)).toBe(9);
  });

  it('legger til dogn uten a forskyve klokkeslettet over sommertidsskiftet', () => {
    const kveldFor = osloTime(2026, 3, 28, 22, 0);
    expect(formatTime(addDays(kveldFor, 1))).toBe('22:00');
    expect(formatDate(addDays(kveldFor, 1))).toBe('29.03.2026');
  });
});

describe('Skjemafelter', () => {
  it('konverterer til og fra datetime-local i norsk tid', () => {
    const tid = osloTime(2026, 8, 24, 22, 15);
    expect(toLocalInputValue(tid)).toBe('2026-08-24T22:15');
    expect(fromLocalInputValue('2026-08-24T22:15').toISOString()).toBe(tid.toISOString());
  });
});

describe('Relativ tid', () => {
  const na = osloTime(2026, 8, 24, 12, 0);
  it('beskriver tid frem og tilbake pa norsk', () => {
    expect(relativeTime(osloTime(2026, 8, 24, 15, 20), na)).toBe('om 3 t 20 min');
    expect(relativeTime(osloTime(2026, 8, 24, 11, 30), na)).toBe('for 30 min siden');
    expect(relativeTime(osloTime(2026, 8, 22, 12, 0), na)).toBe('for 2 dager siden');
    expect(relativeTime(osloTime(2026, 9, 7, 12, 0), na)).toBe('om 2 uker');
  });
});
