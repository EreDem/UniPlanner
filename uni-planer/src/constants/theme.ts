// Designsystem „Tinte & Signal“ (siehe design/): Die Oberfläche bleibt ruhig und fast farblos.
// Farbe trägt nur Bedeutung, nämlich den Status eines Eintrags und das Modul, zu dem er gehört.

import { Platform, StyleSheet } from 'react-native';

export const Colors = {
  light: {
    /** Bildschirmhintergrund („Grund“). */
    grund: '#F3F4F6',
    /** Karten, Blätter, Tab-Leiste („Fläche“). */
    flaeche: '#FFFFFF',
    /** Sekundäre Knöpfe, neutrale Badges, Kacheln („Fläche 2“). */
    flaeche2: '#ECEEF1',
    linie: '#E1E4E9',
    feldRand: '#DCE0E6',
    chipRand: '#C9CED6',
    /** Hintergrund von Blättern mit Formular (Neues Event) und Felder darauf. */
    blatt: '#F3F4F6',
    blattFeld: '#FFFFFF',
    /** Text und primäre Knöpfe („Tinte“). */
    text: '#15171C',
    /** Gedämpfter Text („Text 2“). */
    text2: '#565C68',
    primaer: '#15171C',
    primaerText: '#FFFFFF',
    deaktiviert: '#E1E4E9',
    deaktiviertText: '#8A8F9A',
    gefahr: '#B42318',
    gefahrRand: '#F3B7B1',
    warnungHintergrund: '#FFF6DB',
    warnungText: '#6E4A00',
    fehlerHintergrund: '#FFE9E7',
    erfolgHintergrund: '#DCF3E3',
    erfolgText: '#17643A',
    /** „3 nachzuarbeiten“ in Modulübersichten. */
    rueckstand: '#995B00',
    fortschritt: '#2F8F46',
    fortschrittKnapp: '#D9A007',
    ringSpur: '#DCE0E6',
    schalterAus: '#C9CED6',
    griff: '#C9CED6',
    tabIndikator: '#E4E7EC',
    leisteHintergrund: '#1E2127',
    leisteText: '#F2F4F5',
    leisteAktion: '#8EC1FF',
    moodleKnopf: '#4A5568',
    schleier: 'rgba(15,17,20,0.45)',
  },
  dark: {
    grund: '#0E1013',
    flaeche: '#171A1F',
    flaeche2: '#21252C',
    linie: '#2A2F37',
    feldRand: '#2A2F37',
    chipRand: '#3A404A',
    blatt: '#171A1F',
    blattFeld: '#21252C',
    text: '#EEF0F3',
    text2: '#A2A8B3',
    primaer: '#EEF0F3',
    primaerText: '#0E1013',
    deaktiviert: '#2A2F37',
    deaktiviertText: '#6B717C',
    gefahr: '#FF8F86',
    gefahrRand: '#5C2420',
    warnungHintergrund: '#3A2F0E',
    warnungText: '#F1C744',
    fehlerHintergrund: '#47191A',
    erfolgHintergrund: '#12331F',
    erfolgText: '#72D49B',
    rueckstand: '#F1C744',
    fortschritt: '#5CC26F',
    fortschrittKnapp: '#F2C744',
    ringSpur: '#2A2F37',
    schalterAus: '#3A404A',
    griff: '#3A404A',
    tabIndikator: '#2A2F37',
    leisteHintergrund: '#EEF0F3',
    leisteText: '#15171C',
    leisteAktion: '#0A4EA7',
    moodleKnopf: '#4A5568',
    schleier: 'rgba(0,0,0,0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Figtree in den genutzten Schnitten, geladen in src/app/_layout.tsx. */
export const Schrift = {
  normal: 'Figtree_400Regular',
  mittel: 'Figtree_500Medium',
  halbfett: 'Figtree_600SemiBold',
  fett: 'Figtree_700Bold',
  extrafett: 'Figtree_800ExtraBold',
} as const;

/** Typografie-Stufen des Designsystems: Titel 32, Abschnitt 20, Eintrag 16, Fließtext 15, Details 13. */
export const Typo = StyleSheet.create({
  titel: { fontFamily: Schrift.extrafett, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  abschnitt: { fontFamily: Schrift.fett, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  eintrag: { fontFamily: Schrift.fett, fontSize: 16, lineHeight: 21 },
  fliesstext: { fontFamily: Schrift.normal, fontSize: 15, lineHeight: 22 },
  details: { fontFamily: Schrift.mittel, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  /** Kleine Überschrift in Großbuchstaben, z. B. „STATUS“. */
  label: { fontFamily: Schrift.fett, fontSize: 12, lineHeight: 16, letterSpacing: 0.9, textTransform: 'uppercase' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Ecken: Chips 10, Felder 12, Karten 16, Blätter 28. */
export const Radius = {
  chip: 10,
  feld: 12,
  knopf: 14,
  karte: 16,
  popup: 24,
  blatt: 28,
} as const;

/** Abstand der Karten zum Bildschirmrand und der Titel. */
export const Rand = { karte: 14, titel: 20 } as const;

/** Leichter Schatten unter Karten im hellen Modus; im dunklen Modus tragen die Flächen allein. */
export function kartenSchatten(schema: 'light' | 'dark') {
  if (schema === 'dark') return null;
  return {
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  } as const;
}

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
