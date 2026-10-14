// Zeitformatierung und Tagesgrenzen in Europe/Berlin.
//
// Intern sind alle Zeitpunkte UTC-Millisekunden. Den Berliner UTC-Offset berechnen wir selbst
// aus der EU-Sommerzeitregel, statt uns auf Intl-Zeitzonen in Hermes zu verlassen:
// @date-fns/tz liefert für IANA-Namen wie "Europe/Berlin" ohne Intl-Unterstützung NaN.
// Feste Offsets wie "+02:00" kann TZDate dagegen auch ohne Intl auswerten.

import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

const MINUTE_MS = 60_000;
const STUNDE_MS = 60 * MINUTE_MS;
const TAG_MS = 24 * STUNDE_MS;

/**
 * UTC-Offset von Europe/Berlin in Minuten (60 = MEZ, 120 = MESZ).
 * EU-Regel seit 1996: Sommerzeit vom letzten Sonntag im März bis zum letzten Sonntag
 * im Oktober, Umstellung jeweils um 01:00 UTC.
 */
export function berlinOffsetMinuten(utcMs: number): number {
  const jahr = new Date(utcMs).getUTCFullYear();
  const beginn = letzterSonntagUtc(jahr, 2) + STUNDE_MS;
  const ende = letzterSonntagUtc(jahr, 9) + STUNDE_MS;
  return utcMs >= beginn && utcMs < ende ? 120 : 60;
}

function letzterSonntagUtc(jahr: number, monat: number): number {
  const letzterTag = new Date(Date.UTC(jahr, monat + 1, 0));
  return Date.UTC(jahr, monat, letzterTag.getUTCDate() - letzterTag.getUTCDay());
}

/** Datum in Berliner Wandzeit, z. B. für `format` aus date-fns. */
export function inBerlin(utcMs: number): TZDate {
  const offset = berlinOffsetMinuten(utcMs);
  return new TZDate(utcMs, offset === 120 ? '+02:00' : '+01:00');
}

/** Formatiert mit einem date-fns-Muster in Berliner Zeit und deutscher Sprache. */
export function formatiere(utcMs: number, muster: string): string {
  return format(inBerlin(utcMs), muster, { locale: de });
}

/** Wandelt eine Berliner Wandzeit in UTC-Millisekunden. `monat` ist 1-basiert. */
export function berlinZuUtc(jahr: number, monat: number, tag: number, stunde = 0, minute = 0): number {
  const wand = Date.UTC(jahr, monat - 1, tag, stunde, minute);
  // Bei der doppelten Stunde im Oktober gewinnt die Sommerzeit,
  // eine nicht existierende Uhrzeit im März landet eine Stunde später.
  for (const offset of [120, 60]) {
    const kandidat = wand - offset * MINUTE_MS;
    if (berlinOffsetMinuten(kandidat) === offset) return kandidat;
  }
  return wand - 60 * MINUTE_MS;
}

/** Laufende Tagesnummer (Tage seit 1970) des Berliner Kalendertags. */
function berlinTag(utcMs: number): number {
  return Math.floor((utcMs + berlinOffsetMinuten(utcMs) * MINUTE_MS) / TAG_MS);
}

/** Beginn und Ende (exklusiv) des Berliner Kalendertags, in dem `utcMs` liegt. */
export function tagesgrenzen(utcMs: number): { startMs: number; endeMs: number } {
  const tag = new Date(berlinTag(utcMs) * TAG_MS);
  const jahr = tag.getUTCFullYear();
  const monat = tag.getUTCMonth() + 1;
  const datum = tag.getUTCDate();
  return {
    startMs: berlinZuUtc(jahr, monat, datum),
    endeMs: berlinZuUtc(jahr, monat, datum + 1),
  };
}

/** Montag 00:00 Berliner Zeit der Woche, in der `utcMs` liegt. */
export function wochenbeginn(utcMs: number): number {
  const tag = berlinTag(utcMs);
  // Tag 0 (1.1.1970) war ein Donnerstag; Montag = 0.
  const montag = new Date((tag - ((tag + 3) % 7)) * TAG_MS);
  return berlinZuUtc(montag.getUTCFullYear(), montag.getUTCMonth() + 1, montag.getUTCDate());
}

/** Wie viele Berliner Kalendertage liegt `zielMs` nach `jetztMs`? */
export function kalendertageBis(zielMs: number, jetztMs: number): number {
  return berlinTag(zielMs) - berlinTag(jetztMs);
}

/** „heute“, „morgen“, „in 3 Tagen“, „gestern“, „vor 2 Tagen“. */
export function relativerTag(zielMs: number, jetztMs: number): string {
  const tage = kalendertageBis(zielMs, jetztMs);
  if (tage === 0) return 'heute';
  if (tage === 1) return 'morgen';
  if (tage === -1) return 'gestern';
  return tage > 0 ? `in ${tage} Tagen` : `vor ${-tage} Tagen`;
}

/** Deadline relativ und absolut, z. B. „in 3 Tagen · Mo 26.10., 23:59“. */
export function fristText(fristMs: number, jetztMs: number): string {
  return `${relativerTag(fristMs, jetztMs)} · ${formatiere(fristMs, 'EEEEEE dd.MM., HH:mm')}`;
}

/** Vorlesungstermin, z. B. „Do 15.10., 10:30–12:00“. */
export function terminText(startMs: number, endeMs: number): string {
  return `${formatiere(startMs, 'EEEEEE dd.MM., HH:mm')}–${formatiere(endeMs, 'HH:mm')}`;
}

/** „gerade eben“, „vor 5 Min.“, „vor 3 Std.“, „vor 2 Tagen“. */
export function vorWieLange(zeitpunktMs: number, jetztMs: number): string {
  const differenz = Math.max(0, jetztMs - zeitpunktMs);
  if (differenz < MINUTE_MS) return 'gerade eben';
  if (differenz < STUNDE_MS) return `vor ${Math.floor(differenz / MINUTE_MS)} Min.`;
  if (differenz < TAG_MS) return `vor ${Math.floor(differenz / STUNDE_MS)} Std.`;
  const tage = Math.floor(differenz / TAG_MS);
  return tage === 1 ? 'vor 1 Tag' : `vor ${tage} Tagen`;
}

/**
 * Liest Datum „TT.MM.JJJJ“ und Uhrzeit „HH:MM“ als Berliner Zeit.
 * Gibt `null` zurück, wenn die Eingabe kein gültiges Datum ist.
 */
export function leseDatumZeit(datum: string, uhrzeit: string): number | null {
  const d = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*$/.exec(datum);
  const z = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(uhrzeit);
  if (!d || !z) return null;
  const [tag, monat, jahr, stunde, minute] = [d[1], d[2], d[3], z[1], z[2]].map(Number);
  if (stunde > 23 || minute > 59) return null;
  const pruef = new Date(Date.UTC(jahr, monat - 1, tag));
  if (pruef.getUTCFullYear() !== jahr || pruef.getUTCMonth() !== monat - 1 || pruef.getUTCDate() !== tag) {
    return null;
  }
  return berlinZuUtc(jahr, monat, tag, stunde, minute);
}
