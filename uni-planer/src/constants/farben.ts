import type { EventTyp, Status } from '@/model/types';

import type { Schema } from '@/hooks/use-theme';

/** Kleine Palette für den Modulstreifen, gut sichtbar in hell und dunkel. */
const MODUL_PALETTE = ['#E5484D', '#F76B15', '#E2A336', '#46A758', '#12A594', '#0090FF', '#6E56CF', '#D6409F'];
const OHNE_MODUL = '#8B8D98';

/** Feste Farbe pro Modul, aus einem Hash der Modul-ID. */
export function modulFarbe(modulId: string | null): string {
  if (!modulId) return OHNE_MODUL;
  let hash = 0;
  for (const zeichen of modulId) hash = (hash * 31 + zeichen.charCodeAt(0)) >>> 0;
  return MODUL_PALETTE[hash % MODUL_PALETTE.length];
}

type Ton = 'neutral' | 'gelb' | 'blau' | 'gruen' | 'rot';

const TOENE: Record<Schema, Record<Ton, { hintergrund: string; text: string }>> = {
  light: {
    neutral: { hintergrund: '#E8E8EC', text: '#3A3D42' },
    gelb: { hintergrund: '#FFF1C2', text: '#7A5300' },
    blau: { hintergrund: '#DCEBFF', text: '#0B4FA8' },
    gruen: { hintergrund: '#DDF3E4', text: '#16692F' },
    rot: { hintergrund: '#FFE0DE', text: '#A3221A' },
  },
  dark: {
    neutral: { hintergrund: '#2E3135', text: '#D5D8DC' },
    gelb: { hintergrund: '#4A3A0A', text: '#FFD866' },
    blau: { hintergrund: '#10305A', text: '#8CC0FF' },
    gruen: { hintergrund: '#123D22', text: '#7EE2A0' },
    rot: { hintergrund: '#4D1512', text: '#FF9A92' },
  },
};

/**
 * Offen/ausstehend neutral, angefangen gelblich, erledigt blau,
 * abgegeben bzw. erledigte Vorlesung grün, überfällig rot.
 */
export function statusFarben(schema: Schema, typ: EventTyp, status: Status, ueberfaellig = false) {
  let ton: Ton;
  if (ueberfaellig) ton = 'rot';
  else if (status === 'angefangen') ton = 'gelb';
  else if (status === 'abgegeben' || (status === 'erledigt' && typ === 'vorlesung')) ton = 'gruen';
  else if (status === 'erledigt') ton = 'blau';
  else ton = 'neutral';
  return TOENE[schema][ton];
}
