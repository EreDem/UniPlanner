import type { Punkte } from '@/model/angaben';
import { anzahlIn, baueModulListe, baueModulUebersicht } from '@/model/modul-uebersicht';
import {
  KEINE_KATEGORIE_AUSGEBLENDET,
  STANDARD_EINSTELLUNGEN,
  type Modul,
  type Status,
  type ToDoEingabe,
  type UniEvent,
} from '@/model/types';
import { berlinZuUtc, tagesgrenzen } from '@/zeit';

// "Jetzt" ist Dienstag, 20.10.2026, 12:00 Berliner Zeit.
const JETZT = berlinZuUtc(2026, 10, 20, 12, 0);
const zeit = (tag: number, stunde: number) => berlinZuUtc(2026, 10, tag, stunde, 0);

const modul = (id: string, teil: Partial<Modul> = {}): Modul => ({
  id,
  name: id[0].toUpperCase() + id.slice(1),
  art: null,
  quelle: 'moodle',
  ausgeblendet: false,
  ausgeblendeteKategorien: KEINE_KATEGORIE_AUSGEBLENDET,
  ...teil,
});

function event(id: string, tag: number, teil: Partial<UniEvent> = {}): UniEvent {
  return {
    id,
    typ: 'vorlesung',
    quelle: 'moodle',
    modulId: 'analysis',
    titel: 'Vorlesung',
    beschreibung: null,
    startMs: zeit(tag, 10),
    endeMs: zeit(tag, 12),
    raeume: [],
    ausgeblendet: false,
    entferntMs: null,
    kuerzel: null,
    ...teil,
  };
}

const abgabe = (id: string, tag: number, teil: Partial<UniEvent> = {}) =>
  event(id, tag, { typ: 'abgabe', titel: `${id} ist fällig`, startMs: zeit(tag, 23), endeMs: zeit(tag, 23), ...teil });

function eingabe(events: UniEvent[], teil: Partial<ToDoEingabe> = {}): ToDoEingabe {
  return {
    events,
    module: [modul('analysis'), modul('datenbanken')],
    status: new Map(),
    einstellungen: STANDARD_EINSTELLUNGEN,
    jetztMs: JETZT,
    heute: tagesgrenzen(JETZT),
    ...teil,
  };
}

const ids = (uebersicht: ReturnType<typeof baueModulUebersicht>) =>
  Object.fromEntries(uebersicht.kategorien.map((k) => [k.kategorie, k.eintraege.map((e) => e.event.id)]));

describe('baueModulUebersicht', () => {
  it('sammelt die bisherigen Events nach Kategorie, älteste zuerst', () => {
    const uebersicht = baueModulUebersicht(
      eingabe([
        event('vl-2', 15),
        event('vl-1', 12),
        event('vl-zukunft', 22),
        event('tutorium', 14, { titel: 'Analysis', kuerzel: 'TU' }),
        abgabe('blatt-2', 19),
        abgabe('blatt-1', 13),
        abgabe('blatt-zukunft', 26),
        event('fremd', 13, { modulId: 'datenbanken' }),
      ]),
      modul('analysis'),
      new Map(),
    );
    expect(ids(uebersicht)).toEqual({
      vorlesungen: ['vl-1', 'vl-2'],
      abgaben: ['blatt-1', 'blatt-2'],
      uebungen: ['tutorium'],
    });
    expect(uebersicht.kategorien.map((k) => k.kategorie)).toEqual(['vorlesungen', 'abgaben', 'uebungen']);
  });

  it('lässt ausgeblendete, entfernte und vor dem Startdatum liegende Events weg', () => {
    const uebersicht = baueModulUebersicht(
      eingabe(
        [
          event('vor-start', 9),
          event('manuell-vor-start', 9, { quelle: 'manuell' }),
          event('ausgeblendet', 14, { ausgeblendet: true }),
          event('ausgefallen', 15, { entferntMs: JETZT }),
          abgabe('verschwundene-frist', 16, { entferntMs: JETZT }),
          event('normal', 16),
        ],
        { einstellungen: { ...STANDARD_EINSTELLUNGEN, startdatumMs: zeit(12, 0) } },
      ),
      modul('analysis'),
      new Map(),
    );
    expect(ids(uebersicht)).toEqual({
      vorlesungen: ['manuell-vor-start', 'normal'],
      abgaben: ['verschwundene-frist'],
      uebungen: [],
    });
  });

  it('zeigt alle Kategorien, auch wenn sie in den Einstellungen ausgeblendet sind', () => {
    const ausgeblendet = modul('analysis', {
      ausgeblendeteKategorien: { vorlesungen: true, uebungen: true, abgaben: true },
    });
    const uebersicht = baueModulUebersicht(
      eingabe([event('vl', 12), abgabe('blatt', 13)], { module: [ausgeblendet] }),
      ausgeblendet,
      new Map(),
    );
    expect(ids(uebersicht)).toEqual({ vorlesungen: ['vl'], abgaben: ['blatt'], uebungen: [] });
  });

  it('summiert die Punkte der Abgaben und zählt Nachzuarbeitendes', () => {
    const punkte = new Map<string, Punkte>([
      ['blatt-1', { erreicht: 7.5, max: 10 }],
      ['blatt-2', { erreicht: 8, max: 10 }],
      ['blatt-3', { erreicht: null, max: 10 }],
      ['fremd', { erreicht: 1, max: 100 }],
    ]);
    const status = new Map<string, Status>([['vl-1', 'erledigt']]);
    const uebersicht = baueModulUebersicht(
      eingabe(
        [
          abgabe('blatt-1', 12),
          abgabe('blatt-2', 15),
          abgabe('blatt-3', 19),
          abgabe('fremd', 19, { modulId: 'datenbanken' }),
          event('vl-1', 12),
          event('vl-2', 15),
          event('vl-3', 16),
        ],
        { status },
      ),
      modul('analysis'),
      punkte,
    );
    expect(uebersicht.punkte).toEqual({ erreicht: 15.5, max: 20, prozent: 77.5, bewertet: 2 });
    expect(uebersicht.nachzuarbeiten).toBe(2);
    expect(anzahlIn(uebersicht, 'abgaben')).toBe(3);
    expect(anzahlIn(uebersicht, 'uebungen')).toBe(0);
  });

  it('markiert überfällige, nicht abgegebene Abgaben', () => {
    const uebersicht = baueModulUebersicht(
      eingabe([abgabe('offen', 12), abgabe('abgegeben', 13)], {
        status: new Map<string, Status>([['abgegeben', 'abgegeben']]),
      }),
      modul('analysis'),
      new Map(),
    );
    const abgaben = uebersicht.kategorien.find((k) => k.kategorie === 'abgaben')!;
    expect(abgaben.eintraege.map((e) => [e.event.id, e.ueberfaellig])).toEqual([
      ['offen', true],
      ['abgegeben', false],
    ]);
  });
});

describe('baueModulListe', () => {
  it('listet nicht ausgeblendete Module alphabetisch', () => {
    const liste = baueModulListe(
      eingabe([], {
        module: [modul('datenbanken'), modul('analysis'), modul('spiele', { ausgeblendet: true })],
      }),
      new Map(),
    );
    expect(liste.map((u) => u.modul.id)).toEqual(['analysis', 'datenbanken']);
    // Auch ohne Events stehen alle drei Kategorien da, jeweils leer.
    expect(liste[0].kategorien).toEqual([
      { kategorie: 'vorlesungen', eintraege: [] },
      { kategorie: 'abgaben', eintraege: [] },
      { kategorie: 'uebungen', eintraege: [] },
    ]);
  });
});
