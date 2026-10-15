import { parseIcs } from '@/import/parse';
import { leiteModulAb, slug, verarbeite } from '@/import/verarbeite';
import {
  anzeigeTitel,
  baueToDoListe,
  istVorlesung,
  KEINE_KATEGORIE_AUSGEBLENDET,
  STANDARD_EINSTELLUNGEN,
  stapleNachModul,
  type RohEvent,
} from '@/model/types';
import { berlinZuUtc, formatiere, tagesgrenzen } from '@/zeit';

import beispielIcs from './fixtures/beispiel.ics';

describe('verarbeite mit der Beispiel-Fixture', () => {
  const ergebnis = verarbeite(parseIcs(beispielIcs));
  const vorlesungen = ergebnis.events.filter((e) => e.typ === 'vorlesung');
  const abgaben = ergebnis.events.filter((e) => e.typ === 'abgabe');
  const uid = (nummer: number) => `${nummer}@moodle.example.org`;

  it('leitet drei Module ab, alles eingeblendet', () => {
    const sichtbar = { quelle: 'moodle', ausgeblendet: false, ausgeblendeteKategorien: KEINE_KATEGORIE_AUSGEBLENDET };
    expect(ergebnis.module).toEqual(
      expect.arrayContaining([
        { id: 'analysis', name: 'Analysis', art: 'VO', ...sichtbar },
        { id: 'datenbanken', name: 'Datenbanken', art: 'VU', ...sichtbar },
        { id: 'spieleprogrammierung', name: 'Spieleprogrammierung', art: 'PR', ...sichtbar },
      ]),
    );
    expect(ergebnis.module).toHaveLength(3);
  });

  it('erkennt zwölf Termine mit Dauer und führt Übertragungen zusammen', () => {
    expect(
      vorlesungen.map((e) => [e.modulId, formatiere(e.startMs, 'dd.MM.'), e.uids.length, e.raeume.length]),
    ).toEqual([
      ['analysis', '05.10.', 1, 1],
      ['datenbanken', '06.10.', 1, 1],
      ['spieleprogrammierung', '07.10.', 1, 1],
      ['analysis', '08.10.', 1, 1],
      ['analysis', '09.10.', 1, 1],
      ['analysis', '12.10.', 1, 1],
      ['datenbanken', '13.10.', 1, 1],
      ['spieleprogrammierung', '14.10.', 1, 1],
      ['analysis', '15.10.', 2, 2],
      ['datenbanken', '20.10.', 1, 1],
      ['analysis', '22.10.', 1, 1],
      ['datenbanken', '18.12.', 2, 2],
    ]);
  });

  it('nimmt die erste UID der Gruppe als ID und sammelt Räume unverändert', () => {
    const analysis = vorlesungen.find((e) => e.uids.length === 2 && e.modulId === 'analysis')!;
    expect(analysis.id).toBe(uid(2001));
    expect(analysis.uids).toEqual([uid(2001), uid(2002)]);
    expect(analysis.titel).toBe('Vorlesung');
    expect(analysis.raeume).toEqual(['[1420|001] Hörsaal A', '[1420|002] Hörsaal B']);
    expect(analysis.moodleLastModified).toBe(Date.UTC(2026, 9, 2, 8, 0));

    const praesenz = vorlesungen.find((e) => e.titel === 'Präsenzübung')!;
    expect(praesenz.id).toBe(uid(2005));
    expect(praesenz.raeume).toEqual(['[1420|001] Hörsaal A', '[1420|002] Hörsaal B']);
  });

  it('erkennt vier Abgaben, davon eine ausgeblendet', () => {
    expect(abgaben).toHaveLength(4);
    expect(abgaben.filter((e) => e.ausgeblendet).map((e) => e.titel)).toEqual([
      'Gruppenanmeldung beginnt',
    ]);
    expect(abgaben.filter((e) => !e.ausgeblendet).map((e) => e.titel)).toEqual([
      'Gruppenanmeldung ist fällig',
      'Übungsblatt 1 ist fällig',
      'Assignment for Unit 1 - Search is due',
    ]);
  });

  it('zeigt die Deadline nach der Zeitumstellung in Berliner Zeit', () => {
    const blatt = abgaben.find((e) => e.titel === 'Übungsblatt 1 ist fällig')!;
    expect(blatt.startMs).toBe(Date.UTC(2026, 9, 26, 22, 59));
    expect(formatiere(blatt.startMs, 'EEEEEE dd.MM., HH:mm')).toBe('Mo 26.10., 23:59');
  });

  it('übernimmt die Beschreibung mit echtem Komma', () => {
    const assignment = abgaben.find((e) => e.titel.startsWith('Assignment'))!;
    expect(assignment.modulId).toBe('spieleprogrammierung');
    expect(assignment.beschreibung).toContain('breadth-first search, depth-first search');
  });

  it('übernimmt das Kürzel pro Termin und erkennt das Tutorium daran', () => {
    const tutorium = ergebnis.events.find((e) => e.id === uid(2018))!;
    expect(tutorium).toMatchObject({ modulId: 'analysis', titel: 'Analysis', kuerzel: 'TU' });
    expect(istVorlesung(tutorium)).toBe(false);
    expect(anzeigeTitel(tutorium)).toBe('Analysis');

    const vorlesung = ergebnis.events.find((e) => e.id === uid(2012))!;
    expect(vorlesung.kuerzel).toBe('VO');
    expect(istVorlesung(vorlesung)).toBe(true);
    // Das Modul behält das Kürzel der zuerst importierten Kategorie.
    expect(ergebnis.module.find((m) => m.id === 'analysis')!.art).toBe('VO');
  });

  it('setzt alle Events auf Quelle moodle und nicht entfernt', () => {
    expect(ergebnis.events.every((e) => e.quelle === 'moodle' && e.entferntMs === null)).toBe(true);
  });

  it('zeigt am 09.10. das Tutorium unter „Heute“', () => {
    const jetzt = berlinZuUtc(2026, 10, 9, 12, 0);
    const bereiche = baueToDoListe({
      ...ergebnis,
      status: new Map(),
      einstellungen: STANDARD_EINSTELLUNGEN,
      jetztMs: jetzt,
      heute: tagesgrenzen(jetzt),
    });
    const heute = bereiche.find((b) => b.schluessel === 'heute')!;
    expect(heute.eintraege.map((e) => [e.event.id, istVorlesung(e.event)])).toEqual([[uid(2018), false]]);
  });

  it('ergibt am 14.10. Stapel unter „Nachzuarbeiten“', () => {
    const jetzt = berlinZuUtc(2026, 10, 14, 12, 0);
    const bereiche = baueToDoListe({
      ...ergebnis,
      status: new Map(),
      einstellungen: STANDARD_EINSTELLUNGEN,
      jetztMs: jetzt,
      heute: tagesgrenzen(jetzt),
    });
    const nachzuarbeiten = bereiche.find((b) => b.schluessel === 'nachzuarbeiten')!;
    const posten = stapleNachModul(nachzuarbeiten.eintraege).map((p) =>
      p.art === 'stapel' ? `${p.stapel.modul?.name} (${p.stapel.eintraege.length})` : p.eintrag.modul?.name,
    );

    expect(nachzuarbeiten.eintraege).toHaveLength(6);
    expect(posten).toEqual(['Analysis (3)', 'Datenbanken (2)', 'Spieleprogrammierung']);
    expect(bereiche.find((b) => b.schluessel === 'heute')!.eintraege.map((e) => e.modul?.name)).toEqual([
      'Spieleprogrammierung',
    ]);
  });
});

describe('verarbeite: Randfälle', () => {
  const roh = (teil: Partial<RohEvent> & Pick<RohEvent, 'uid'>): RohEvent => ({
    titel: 'Titel',
    beschreibung: null,
    startMs: 1000,
    endeMs: 1000,
    ort: null,
    kategorie: '(VU) Datenbanken',
    lastModifiedMs: null,
    ...teil,
  });

  it('führt Abgaben mit gleichem Modul und gleicher Frist nicht zusammen', () => {
    const { events } = verarbeite([
      roh({ uid: 'a', titel: 'Übungsblatt 3 ist fällig' }),
      roh({ uid: 'b', titel: 'Quiz 2 schließt' }),
    ]);
    expect(events).toHaveLength(2);
  });

  it('führt Vorlesungen verschiedener Module nicht zusammen', () => {
    const { events } = verarbeite([
      roh({ uid: 'a', endeMs: 2000 }),
      roh({ uid: 'b', endeMs: 2000, kategorie: '(VO) Analysis' }),
    ]);
    expect(events).toHaveLength(2);
  });

  it('nutzt die alphabetisch erste UID, unabhängig von der Reihenfolge in der Datei', () => {
    const { events } = verarbeite([
      roh({ uid: 'z', endeMs: 2000, ort: 'Raum Z' }),
      roh({ uid: 'm', endeMs: 2000, ort: 'Raum M' }),
    ]);
    expect(events[0].id).toBe('m');
    expect(events[0].raeume).toEqual(['Raum M', 'Raum Z']);
  });

  it('erlaubt Events ohne Kategorie', () => {
    const { events, module } = verarbeite([roh({ uid: 'a', kategorie: null })]);
    expect(module).toHaveLength(0);
    expect(events[0].modulId).toBeNull();
  });
});

describe('Modul ableiten', () => {
  it('trennt Art und Name', () => {
    expect(leiteModulAb('(VU) Datenbanken')).toEqual({ id: 'datenbanken', name: 'Datenbanken', art: 'VU' });
  });

  it('kommt ohne Präfix aus', () => {
    expect(leiteModulAb('Datenbanken')).toEqual({ id: 'datenbanken', name: 'Datenbanken', art: null });
  });

  it('bildet Slugs mit Umlauten und ß', () => {
    expect(slug('Analysis für Informatiker')).toBe('analysis-fuer-informatiker');
    expect(slug('Größe & Maß')).toBe('groesse-mass');
    expect(slug('Ökonomie Übung')).toBe('oekonomie-uebung');
  });
});
