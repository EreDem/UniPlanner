import type { EventTyp, Status } from '@/model/types';

import type { Schema } from '@/hooks/use-theme';

/**
 * Modulfarben Rot, Orange, Senf, Grün, Petrol, Blau, Violett, Pink. Die hellen Töne erreichen
 * mindestens 3:1 gegen Weiß, die dunklen gegen die dunkle Fläche.
 */
const MODUL_PALETTE: Record<Schema, readonly string[]> = {
  light: ['#E5484D', '#E5640F', '#B07F00', '#2F8F46', '#0E9384', '#0B78D1', '#6E56CF', '#C93C8F'],
  dark: ['#FF6B6E', '#FF8B47', '#E2B33A', '#5CC26F', '#33C3AE', '#4FA6F5', '#A08CF2', '#F07BBE'],
};
const OHNE_MODUL: Record<Schema, string> = { light: '#8A8F9A', dark: '#6B717C' };

/** Feste Farbe pro Modul, aus einem Hash der Modul-ID. Ein Modul behält seine Farbe dauerhaft. */
export function modulFarbe(modulId: string | null, schema: Schema): string {
  if (!modulId) return OHNE_MODUL[schema];
  let hash = 0;
  for (const zeichen of modulId) hash = (hash * 31 + zeichen.charCodeAt(0)) >>> 0;
  return MODUL_PALETTE[schema][hash % MODUL_PALETTE[schema].length];
}

export const PALETTE = { rot: 0, orange: 1, senf: 2, gruen: 3, petrol: 4, blau: 5, violett: 6, pink: 7 } as const;

/** Eine Farbe aus der Modulpalette, z. B. für Illustrationen. */
export function paletteFarbe(farbe: keyof typeof PALETTE, schema: Schema): string {
  return MODUL_PALETTE[schema][PALETTE[farbe]];
}

type Ton ='neutral' | 'gelb' | 'blau' | 'gruen' | 'rot' | 'blass';

const TOENE: Record<Schema, Record<Ton, { hintergrund: string; text: string; punkt: string }>> = {
  light: {
    neutral: { hintergrund: '#ECEEF1', text: '#3F4550', punkt: '#3F4551' },
    gelb: { hintergrund: '#FFF0C2', text: '#6E4A00', punkt: '#D9A007' },
    blau: { hintergrund: '#DCEAFF', text: '#0A4EA7', punkt: '#0B78D1' },
    gruen: { hintergrund: '#DCF3E3', text: '#17643A', punkt: '#2F8F46' },
    rot: { hintergrund: '#FFE2E0', text: '#B42317', punkt: '#B42318' },
    blass: { hintergrund: '#ECEEF1', text: '#3F4550', punkt: '#C9CED6' },
  },
  dark: {
    neutral: { hintergrund: '#2A2F37', text: '#C8CDD5', punkt: '#C9CED6' },
    gelb: { hintergrund: '#3A2F0E', text: '#F1C744', punkt: '#F2C744' },
    blau: { hintergrund: '#112A4D', text: '#86BAFF', punkt: '#86BBFF' },
    gruen: { hintergrund: '#12331F', text: '#72D49A', punkt: '#72D49B' },
    rot: { hintergrund: '#47191A', text: '#FF8F86', punkt: '#FF8F86' },
    blass: { hintergrund: '#2A2F37', text: '#C8CDD5', punkt: '#3A404A' },
  },
};

/**
 * Offen/ausstehend und verpasst neutral, angefangen gelb, erledigt (Abgabe) blau,
 * abgegeben bzw. erledigte Vorlesung grün, überfällig rot. `punkt` ist der Farbpunkt in der
 * Statusauswahl; „Verpasst“ bekommt dort einen blassen Punkt.
 */
export function statusFarben(schema: Schema, typ: EventTyp, status: Status, ueberfaellig = false) {
  let ton: Ton;
  if (ueberfaellig) ton = 'rot';
  else if (status === 'angefangen') ton = 'gelb';
  else if (status === 'abgegeben' || (status === 'erledigt' && typ === 'vorlesung')) ton = 'gruen';
  else if (status === 'erledigt') ton = 'blau';
  else if (status === 'verpasst') ton = 'blass';
  else ton = 'neutral';
  return TOENE[schema][ton];
}
