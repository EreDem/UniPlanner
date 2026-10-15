import {
  anzeigeTitel,
  artText,
  baueAusgeblendetListe,
  baueErledigtListe,
  baueToDoListe,
  effektiverStatus,
  hatStatus,
  istAbgeschlossen,
  istErledigt,
  istVorlesung,
  kategorieVon,
  KEINE_KATEGORIE_AUSGEBLENDET,
  stapleNachModul,
  STANDARD_EINSTELLUNGEN,
  STATUS_WERTE,
  statusNachAbhaken,
  type Modul,
  type Status,
  type ToDoEingabe,
  type UniEvent,
} from '@/model/types';
import { berlinZuUtc, tagesgrenzen } from '@/zeit';

// "Jetzt" ist Dienstag, 20.10.2026, 12:00 Berliner Zeit.
const JETZT = berlinZuUtc(2026, 10, 20, 12, 0);
const zeit = (tag: number, stunde: number, minute = 0) => berlinZuUtc(2026, 10, tag, stunde, minute);

function event(teil: Partial<UniEvent> & Pick<UniEvent, 'id'>): UniEvent {
  return {
    typ: 'vorlesung',
    quelle: 'moodle',
    modulId: 'datenbanken',
    titel: teil.id,
    beschreibung: null,
    startMs: zeit(20, 10),
    endeMs: zeit(20, 11, 30),
    raeume: [],
    ausgeblendet: false,
    entferntMs: null,
    kuerzel: null,
    ...teil,
  };
}

const vorlesung = (id: string, tag: number, stunde: number) =>
  event({ id, startMs: zeit(tag, stunde), endeMs: zeit(tag, stunde + 1, 30) });
const abgabe = (id: string, tag: number, stunde = 23, minute = 59) =>
  event({ id, typ: 'abgabe', startMs: zeit(tag, stunde, minute), endeMs: zeit(tag, stunde, minute) });

const modul = (id: string, name: string, teil: Partial<Modul> = {}): Modul => ({
  id,
  name,
  art: null,
  quelle: 'moodle',
  ausgeblendet: false,
  ausgeblendeteKategorien: KEINE_KATEGORIE_AUSGEBLENDET,
  ...teil,
});

const MODULE: Modul[] = [modul('datenbanken', 'Datenbanken', { art: 'VU' }), modul('analysis', 'Analysis', { ausgeblendet: true })];

function liste(events: UniEvent[], teil: Partial<ToDoEingabe> = {}) {
  return baueToDoListe({
    events,
    module: MODULE,
    status: new Map(),
    einstellungen: STANDARD_EINSTELLUNGEN,
    jetztMs: JETZT,
    heute: tagesgrenzen(JETZT),
    ...teil,
  });
}

const ids = (bereiche: ReturnType<typeof liste>) =>
  Object.fromEntries(bereiche.map((b) => [b.schluessel, b.eintraege.map((e) => e.event.id)]));

describe('baueToDoListe', () => {
  it('sortiert in Heute, Abgaben und Nachzuarbeiten', () => {
    const bereiche = liste([
      vorlesung('heute-spaet', 20, 16),
      vorlesung('heute-frueh', 20, 8),
      vorlesung('morgen', 21, 10),
      vorlesung('letzte-woche', 13, 10),
      vorlesung('gestern', 19, 10),
      abgabe('frist-spaet', 30),
      abgabe('frist-ueberfaellig', 18),
      abgabe('frist-bald', 22),
    ]);
    expect(bereiche.map((b) => b.titel)).toEqual(['Heute', 'Abgaben', 'Nachzuarbeiten']);
    expect(ids(bereiche)).toEqual({
      heute: ['heute-frueh', 'heute-spaet'],
      abgaben: ['frist-ueberfaellig', 'frist-bald', 'frist-spaet'],
      nachzuarbeiten: ['letzte-woche', 'gestern'],
    });
  });

  it('nimmt verpasste Abgaben aus der To-do-Liste und aus dem Erledigt-Tab', () => {
    const status = new Map<string, Status>([
      ['verpasst', 'verpasst'],
      ['abgegeben', 'abgegeben'],
    ]);
    const events = [abgabe('verpasst', 18), abgabe('abgegeben', 19), abgabe('offen', 18)];
    expect(ids(liste(events, { status }))).toEqual({ abgaben: ['offen'] });
    expect(
      ids(
        baueErledigtListe({
          events,
          module: MODULE,
          status,
          einstellungen: STANDARD_EINSTELLUNGEN,
          jetztMs: JETZT,
          heute: tagesgrenzen(JETZT),
        }),
      ),
    ).toEqual({ 'erledigte-abgaben': ['abgegeben'] });
  });

  it('markiert überfällige Abgaben', () => {
    const [abgaben] = liste([abgabe('alt', 19), abgabe('neu', 21)]);
    expect(abgaben.eintraege.map((e) => [e.event.id, e.ueberfaellig])).toEqual([
      ['alt', true],
      ['neu', false],
    ]);
  });

  it('blendet abgegebene Abgaben und erledigte Vorlesungen aus, aber nicht nur erledigte Abgaben', () => {
    const status = new Map<string, Status>([
      ['abgegeben', 'abgegeben'],
      ['fertig', 'erledigt'],
      ['vorlesung-erledigt', 'erledigt'],
    ]);
    const bereiche = liste(
      [abgabe('abgegeben', 22), abgabe('fertig', 23), vorlesung('vorlesung-erledigt', 19, 10)],
      { status },
    );
    expect(ids(bereiche)).toEqual({ abgaben: ['fertig'] });
    expect(bereiche[0].eintraege[0].status).toBe('erledigt');
  });

  it('nutzt den Standardstatus aus den Einstellungen', () => {
    const events = [vorlesung('gestern', 19, 10), vorlesung('heute', 20, 8), vorlesung('offen', 18, 10)];
    const bereiche = liste(events, {
      einstellungen: { ...STANDARD_EINSTELLUNGEN, vorlesungStandard: 'erledigt' },
      status: new Map<string, Status>([['offen', 'nachzuarbeiten']]),
    });
    expect(ids(bereiche)).toEqual({ heute: ['heute'], nachzuarbeiten: ['offen'] });
    expect(bereiche[0].eintraege[0].status).toBe('erledigt');
  });

  it('behält erledigte Vorlesungen bis Tagesende unter „Heute“', () => {
    const bereiche = liste([vorlesung('frueh', 20, 8), vorlesung('spaet', 20, 16)], {
      status: new Map<string, Status>([['frueh', 'erledigt']]),
    });
    expect(ids(bereiche)).toEqual({ heute: ['frueh', 'spaet'] });
    expect(bereiche[0].eintraege.map((e) => e.status)).toEqual(['erledigt', 'nachzuarbeiten']);
  });

  it('übernimmt heute erledigte Vorlesungen am nächsten Tag nicht in „Nachzuarbeiten“', () => {
    const morgen = berlinZuUtc(2026, 10, 21, 12, 0);
    const bereiche = liste([vorlesung('erledigt', 20, 8), vorlesung('offen', 20, 16)], {
      status: new Map<string, Status>([['erledigt', 'erledigt']]),
      jetztMs: morgen,
      heute: tagesgrenzen(morgen),
    });
    expect(ids(bereiche)).toEqual({ nachzuarbeiten: ['offen'] });
  });

  it('zeigt bei „nur Abgaben“ keine Vorlesungen', () => {
    const bereiche = liste([vorlesung('heute', 20, 8), vorlesung('gestern', 19, 10), abgabe('frist', 22)], {
      einstellungen: { ...STANDARD_EINSTELLUNGEN, nurAbgaben: true },
    });
    expect(ids(bereiche)).toEqual({ abgaben: ['frist'] });
  });

  it('lässt ausgeblendete Events und Events ausgeblendeter Module weg', () => {
    const bereiche = liste([
      event({ ...abgabe('versteckt', 22), ausgeblendet: true }),
      event({ ...abgabe('analysis', 22), modulId: 'analysis' }),
      event({ ...abgabe('ohne-modul', 22), modulId: null }),
    ]);
    expect(ids(bereiche)).toEqual({ abgaben: ['ohne-modul'] });
    expect(bereiche[0].eintraege[0].modul).toBeNull();
  });

  it('lässt entfernte Vorlesungen weg, behält aber entfernte Abgaben', () => {
    const bereiche = liste([
      event({ ...vorlesung('ausgefallen', 20, 16), entferntMs: JETZT }),
      event({ ...abgabe('verschwunden', 25), entferntMs: JETZT }),
    ]);
    expect(ids(bereiche)).toEqual({ abgaben: ['verschwunden'] });
  });

  it('zeigt vergangene Vorlesungen von heute nur unter Heute', () => {
    expect(ids(liste([vorlesung('vormittag', 20, 8)]))).toEqual({ heute: ['vormittag'] });
  });

  it('blendet einzelne Kategorien eines Moduls aus', () => {
    const events = [
      vorlesung('vl-heute', 20, 8),
      event({ ...vorlesung('tut-heute', 20, 14), titel: 'Tutorium' }),
      vorlesung('vl-gestern', 19, 10),
      abgabe('frist', 22),
      event({ ...abgabe('frist-ohne-modul', 22), modulId: null }),
    ];
    const mitAusgeblendet = (kategorien: Partial<Modul['ausgeblendeteKategorien']>) =>
      ids(
        liste(events, {
          module: [
            modul('datenbanken', 'Datenbanken', {
              ausgeblendeteKategorien: { ...KEINE_KATEGORIE_AUSGEBLENDET, ...kategorien },
            }),
          ],
        }),
      );

    expect(mitAusgeblendet({ uebungen: true })).toEqual({
      heute: ['vl-heute'],
      abgaben: ['frist', 'frist-ohne-modul'],
      nachzuarbeiten: ['vl-gestern'],
    });
    expect(mitAusgeblendet({ vorlesungen: true })).toEqual({
      heute: ['tut-heute'],
      abgaben: ['frist', 'frist-ohne-modul'],
    });
    expect(mitAusgeblendet({ abgaben: true })).toEqual({
      heute: ['vl-heute', 'tut-heute'],
      abgaben: ['frist-ohne-modul'],
      nachzuarbeiten: ['vl-gestern'],
    });
  });

  it('blendet beim ganzen Modul alles aus, unabhängig von den Kategorien', () => {
    const bereiche = liste([vorlesung('vl', 20, 8), abgabe('frist', 22)], {
      module: [modul('datenbanken', 'Datenbanken', { ausgeblendet: true })],
    });
    expect(bereiche).toEqual([]);
  });

  it('blendet Moodle-Events vor dem Startdatum aus, manuelle nicht', () => {
    const startdatum = zeit(19, 0);
    const bereiche = liste(
      [
        vorlesung('vorher', 16, 10),
        abgabe('frist-vorher', 18),
        event({ ...vorlesung('manuell-vorher', 16, 12), quelle: 'manuell' }),
        vorlesung('ab-start', 19, 10),
        abgabe('frist-danach', 22),
      ],
      { einstellungen: { ...STANDARD_EINSTELLUNGEN, startdatumMs: startdatum } },
    );
    expect(ids(bereiche)).toEqual({
      abgaben: ['frist-danach'],
      nachzuarbeiten: ['manuell-vorher', 'ab-start'],
    });
  });

  it('gibt eine leere Liste zurück, wenn alles erledigt ist', () => {
    expect(liste([])).toEqual([]);
  });
});

describe('baueAusgeblendetListe', () => {
  const versteckt = (e: UniEvent) => event({ ...e, ausgeblendet: true });

  it('listet ausgeblendete Events nach Datum, mit Modul und Status', () => {
    const eintraege = baueAusgeblendetListe({
      events: [versteckt(abgabe('spaet', 25)), versteckt(vorlesung('frueh', 13, 10)), versteckt(abgabe('mitte', 19))],
      module: MODULE,
      status: new Map<string, Status>([['frueh', 'erledigt']]),
      einstellungen: STANDARD_EINSTELLUNGEN,
      jetztMs: JETZT,
    });
    expect(eintraege.map((e) => [e.event.id, e.status, e.ueberfaellig, e.modul?.id])).toEqual([
      ['frueh', 'erledigt', false, 'datenbanken'],
      ['mitte', 'ausstehend', true, 'datenbanken'],
      ['spaet', 'ausstehend', false, 'datenbanken'],
    ]);
  });

  it('lässt Events vor dem Startdatum und nicht ausgeblendete weg', () => {
    const eintraege = baueAusgeblendetListe({
      events: [versteckt(abgabe('vor-start', 12)), versteckt(abgabe('danach', 22)), abgabe('sichtbar', 22)],
      module: MODULE,
      status: new Map(),
      einstellungen: { ...STANDARD_EINSTELLUNGEN, startdatumMs: zeit(19, 0) },
      jetztMs: JETZT,
    });
    expect(eintraege.map((e) => e.event.id)).toEqual(['danach']);
  });
});

describe('baueErledigtListe', () => {
  function erledigt(events: UniEvent[], teil: Partial<ToDoEingabe> = {}) {
    return baueErledigtListe({
      events,
      module: MODULE,
      status: new Map(),
      einstellungen: STANDARD_EINSTELLUNGEN,
      jetztMs: JETZT,
      heute: tagesgrenzen(JETZT),
      ...teil,
    });
  }

  it('zeigt abgegebene Abgaben und erledigte Vorlesungen, neueste zuerst', () => {
    const status = new Map<string, Status>([
      ['blatt-1', 'abgegeben'],
      ['blatt-2', 'abgegeben'],
      ['blatt-3', 'erledigt'],
      ['vl-alt', 'erledigt'],
      ['vl-neu', 'erledigt'],
      ['vl-offen', 'nachzuarbeiten'],
    ]);
    const bereiche = erledigt(
      [
        abgabe('blatt-1', 12),
        abgabe('blatt-2', 19),
        abgabe('blatt-3', 22),
        vorlesung('vl-alt', 13, 10),
        vorlesung('vl-neu', 19, 10),
        vorlesung('vl-offen', 16, 10),
      ],
      { status },
    );
    expect(bereiche.map((b) => b.titel)).toEqual(['Abgegeben', 'Vorlesungen']);
    expect(ids(bereiche)).toEqual({
      'erledigte-abgaben': ['blatt-2', 'blatt-1'],
      'erledigte-vorlesungen': ['vl-neu', 'vl-alt'],
    });
  });

  it('zeigt abgehakte künftige Vorlesungen, aber keine, die nur per Standard erledigt sind', () => {
    const bereiche = erledigt([vorlesung('abgehakt', 22, 10), vorlesung('standard', 23, 10), vorlesung('vorbei', 19, 10)], {
      status: new Map<string, Status>([['abgehakt', 'erledigt']]),
      einstellungen: { ...STANDARD_EINSTELLUNGEN, vorlesungStandard: 'erledigt' },
    });
    expect(ids(bereiche)).toEqual({ 'erledigte-vorlesungen': ['abgehakt', 'vorbei'] });
  });

  it('beachtet ausgeblendete Module und „nur Abgaben“', () => {
    const status = new Map<string, Status>([
      ['analysis', 'abgegeben'],
      ['vl', 'erledigt'],
      ['blatt', 'abgegeben'],
    ]);
    const bereiche = erledigt(
      [event({ ...abgabe('analysis', 19), modulId: 'analysis' }), vorlesung('vl', 19, 10), abgabe('blatt', 19)],
      { status, einstellungen: { ...STANDARD_EINSTELLUNGEN, nurAbgaben: true } },
    );
    expect(ids(bereiche)).toEqual({ 'erledigte-abgaben': ['blatt'] });
  });

  it('ergänzt die To-do-Liste ohne Überschneidung', () => {
    const events = [
      abgabe('a', 22),
      abgabe('b', 19),
      vorlesung('c', 19, 10),
      vorlesung('d', 20, 8),
      vorlesung('e', 20, 10),
    ];
    const status = new Map<string, Status>([
      ['a', 'erledigt'],
      ['b', 'abgegeben'],
      ['c', 'erledigt'],
      ['e', 'erledigt'],
    ]);
    const offen = liste(events, { status }).flatMap((b) => b.eintraege.map((e) => e.event.id));
    const fertig = erledigt(events, { status }).flatMap((b) => b.eintraege.map((e) => e.event.id));
    expect(offen.sort()).toEqual(['a', 'd', 'e']);
    expect(fertig.sort()).toEqual(['b', 'c']);
  });

  it('blendet auch hier Moodle-Events vor dem Startdatum aus', () => {
    const status = new Map<string, Status>([
      ['alt', 'abgegeben'],
      ['neu', 'abgegeben'],
    ]);
    const bereiche = erledigt([abgabe('alt', 12), abgabe('neu', 19)], {
      status,
      einstellungen: { ...STANDARD_EINSTELLUNGEN, startdatumMs: zeit(19, 0) },
    });
    expect(ids(bereiche)).toEqual({ 'erledigte-abgaben': ['neu'] });
  });

  it('zeigt heute erledigte Vorlesungen erst ab dem nächsten Tag', () => {
    const status = new Map<string, Status>([['heute', 'erledigt']]);
    expect(erledigt([vorlesung('heute', 20, 8)], { status })).toEqual([]);

    const morgen = berlinZuUtc(2026, 10, 21, 12, 0);
    expect(ids(erledigt([vorlesung('heute', 20, 8)], { status, jetztMs: morgen, heute: tagesgrenzen(morgen) }))).toEqual({
      'erledigte-vorlesungen': ['heute'],
    });
  });
});

describe('stapleNachModul', () => {
  const nachzuarbeiten = (events: UniEvent[]) =>
    liste(events).find((b) => b.schluessel === 'nachzuarbeiten')!.eintraege;
  const kurz = (posten: ReturnType<typeof stapleNachModul>) =>
    posten.map((p) =>
      p.art === 'stapel' ? `${p.stapel.modulId}: ${p.stapel.eintraege.map((e) => e.event.id).join(', ')}` : p.eintrag.event.id,
    );

  it('fasst mehrere Vorlesungen eines Moduls zusammen, an der Stelle der ältesten', () => {
    const eintraege = nachzuarbeiten([
      vorlesung('db-1', 12, 10),
      event({ ...vorlesung('ana-1', 13, 10), modulId: 'spiele' }),
      vorlesung('db-2', 14, 10),
      vorlesung('db-3', 16, 10),
    ]);
    expect(kurz(stapleNachModul(eintraege))).toEqual(['datenbanken: db-1, db-2, db-3', 'ana-1']);
  });

  it('lässt einzelne Vorlesungen und solche ohne Modul einzeln', () => {
    const eintraege = nachzuarbeiten([
      vorlesung('db-1', 12, 10),
      event({ ...vorlesung('frei-1', 13, 10), modulId: null }),
      event({ ...vorlesung('frei-2', 14, 10), modulId: null }),
    ]);
    expect(kurz(stapleNachModul(eintraege))).toEqual(['db-1', 'frei-1', 'frei-2']);
  });

  it('stapelt erledigte Vorlesungen mit der neuesten vorn', () => {
    const status = new Map<string, Status>([
      ['db-alt', 'erledigt'],
      ['db-neu', 'erledigt'],
      ['ana', 'erledigt'],
    ]);
    const [vorlesungen] = baueErledigtListe({
      events: [vorlesung('db-alt', 12, 10), vorlesung('db-neu', 16, 10), event({ ...vorlesung('ana', 14, 10), modulId: 'spiele' })],
      module: MODULE,
      status,
      einstellungen: STANDARD_EINSTELLUNGEN,
      jetztMs: JETZT,
      heute: tagesgrenzen(JETZT),
    });
    expect(kurz(stapleNachModul(vorlesungen.eintraege))).toEqual(['datenbanken: db-neu, db-alt', 'ana']);
  });

  it('übernimmt das Modul in den Stapel', () => {
    const [posten] = stapleNachModul(nachzuarbeiten([vorlesung('a', 12, 10), vorlesung('b', 13, 10)]));
    expect(posten.art === 'stapel' && posten.stapel.modul?.name).toBe('Datenbanken');
  });
});

describe('Vorlesungen und andere Veranstaltungen', () => {
  const termin = (titel: string, teil: Partial<UniEvent> = {}) => event({ id: titel, titel, ...teil });

  it('erkennt Vorlesungen und andere Veranstaltungen am Titel', () => {
    for (const titel of ['Vorlesung', 'Analysis für Informatiker', 'Vorlesung und Übung', 'Lecture 3']) {
      expect([titel, istVorlesung(termin(titel))]).toEqual([titel, true]);
    }
    for (const titel of ['Tutorium Gruppe 3', 'Präsenzübung', 'Globaluebung', 'Praktikum', 'Proseminar', 'Klausur']) {
      expect([titel, istVorlesung(termin(titel))]).toEqual([titel, false]);
    }
  });

  it('nutzt das Kürzel, wenn der Titel nichts verrät', () => {
    for (const kuerzel of ['TU', 'UE', 'PR', 'SE', 'PS', 'tu']) {
      expect([kuerzel, istVorlesung(termin('Analysis', { kuerzel }))]).toEqual([kuerzel, false]);
    }
    for (const kuerzel of ['VO', 'VU', 'XY', null]) {
      expect([kuerzel, istVorlesung(termin('Analysis', { kuerzel }))]).toEqual([kuerzel, true]);
    }
  });

  it('lässt den Titel vor dem Kürzel entscheiden', () => {
    // Gemischter Kurs: Übungstermine im VU-Kurs, Vorlesungstermine im Praktikumskurs.
    expect(istVorlesung(termin('Übung', { kuerzel: 'VU' }))).toBe(false);
    expect(istVorlesung(termin('Vorlesung', { kuerzel: 'PR' }))).toBe(true);
  });

  it('lässt manuelle Vorlesungen Vorlesungen sein und Abgaben Abgaben', () => {
    expect(istVorlesung(termin('Tutorium', { quelle: 'manuell' }))).toBe(true);
    expect(istVorlesung(abgabe('Übungsblatt 2 ist fällig', 22))).toBe(false);
    expect(artText(termin('Tutorium'))).toBe('Übung');
    expect(artText(termin('Vorlesung'))).toBe('Vorlesung');
  });

  it('ordnet jedes Event einer Kategorie zu', () => {
    expect(kategorieVon(termin('Vorlesung'))).toBe('vorlesungen');
    expect(kategorieVon(termin('Analysis', { kuerzel: 'TU' }))).toBe('uebungen');
    expect(kategorieVon(abgabe('frist', 22))).toBe('abgaben');
  });

  it('zeigt andere Veranstaltungen nur unter „Heute“', () => {
    const tutorium = (id: string, tag: number) =>
      event({ ...vorlesung(id, tag, 14), titel: 'Tutorium' });
    const bereiche = liste([tutorium('tut-heute', 20), tutorium('tut-gestern', 19), vorlesung('vl-gestern', 19, 10)]);
    expect(ids(bereiche)).toEqual({ heute: ['tut-heute'], nachzuarbeiten: ['vl-gestern'] });
  });

  it('nimmt andere Veranstaltungen nicht in den Erledigt-Tab auf', () => {
    const status = new Map<string, Status>([
      ['tut', 'erledigt'],
      ['vl', 'erledigt'],
    ]);
    const bereiche = baueErledigtListe({
      events: [event({ ...vorlesung('tut', 19, 14), titel: 'Übung' }), vorlesung('vl', 19, 10)],
      module: MODULE,
      status,
      einstellungen: STANDARD_EINSTELLUNGEN,
      jetztMs: JETZT,
      heute: tagesgrenzen(JETZT),
    });
    expect(ids(bereiche)).toEqual({ 'erledigte-vorlesungen': ['vl'] });
  });
});

describe('anzeigeTitel', () => {
  it('nennt Moodle-Vorlesungen einheitlich „Vorlesung“', () => {
    expect(anzeigeTitel(event({ id: 'a', titel: 'Analysis für Informatiker' }))).toBe('Vorlesung');
  });

  it('lässt Abgaben, andere Veranstaltungen und manuelle Events unverändert', () => {
    expect(anzeigeTitel(abgabe('Übungsblatt 1 ist fällig', 22))).toBe('Übungsblatt 1 ist fällig');
    expect(anzeigeTitel(event({ id: 'b', titel: 'Tutorium', quelle: 'manuell' }))).toBe('Tutorium');
    expect(anzeigeTitel(event({ id: 'c', titel: 'Präsenzübung' }))).toBe('Präsenzübung');
  });
});

describe('istErledigt', () => {
  it('unterscheidet Vorlesungen und Abgaben', () => {
    expect(istErledigt('vorlesung', 'erledigt')).toBe(true);
    expect(istErledigt('vorlesung', 'nachzuarbeiten')).toBe(false);
    expect(istErledigt('abgabe', 'abgegeben')).toBe(true);
    expect(istErledigt('abgabe', 'erledigt')).toBe(false);
    expect(istErledigt('abgabe', 'verpasst')).toBe(false);
  });
});

describe('istAbgeschlossen', () => {
  it('zählt Erledigtes und verpasste Abgaben, aber nicht Offenes', () => {
    expect(istAbgeschlossen('abgabe', 'verpasst')).toBe(true);
    expect(istAbgeschlossen('abgabe', 'abgegeben')).toBe(true);
    expect(istAbgeschlossen('abgabe', 'erledigt')).toBe(false);
    expect(istAbgeschlossen('vorlesung', 'erledigt')).toBe(true);
    expect(istAbgeschlossen('vorlesung', 'nachzuarbeiten')).toBe(false);
  });

  it('bietet „Verpasst“ nur bei Abgaben an', () => {
    expect(STATUS_WERTE.abgabe).toContain('verpasst');
    expect(STATUS_WERTE.vorlesung).not.toContain('verpasst');
    expect(effektiverStatus('vorlesung', 'verpasst', STANDARD_EINSTELLUNGEN)).toBe('nachzuarbeiten');
  });
});

describe('statusNachAbhaken', () => {
  it('hakt Abgaben als abgegeben und Vorlesungen als erledigt ab', () => {
    for (const status of ['ausstehend', 'angefangen', 'erledigt', 'verpasst'] as const) {
      expect(statusNachAbhaken('abgabe', status)).toBe('abgegeben');
    }
    expect(statusNachAbhaken('vorlesung', 'nachzuarbeiten')).toBe('erledigt');
  });

  it('nimmt das Häkchen zurück, wenn das Event schon erledigt ist', () => {
    expect(statusNachAbhaken('abgabe', 'abgegeben')).toBe('ausstehend');
    expect(statusNachAbhaken('vorlesung', 'erledigt')).toBe('nachzuarbeiten');
  });

  it('zeigt das Häkchen genau bei erledigten Events, auch wenn der Status manuell gewählt wurde', () => {
    // Abgehakt = istErledigt; „erledigt“ bei Abgaben (noch nicht hochgeladen) zählt nicht.
    expect(istErledigt('abgabe', statusNachAbhaken('abgabe', 'angefangen'))).toBe(true);
    expect(istErledigt('abgabe', 'erledigt')).toBe(false);
    expect(istErledigt('vorlesung', 'erledigt')).toBe(true);
  });
});

describe('hatStatus', () => {
  it('gibt Abgaben und Vorlesungen einen Status, anderen Veranstaltungen nicht', () => {
    expect(hatStatus(abgabe('a', 22))).toBe(true);
    expect(hatStatus(event({ id: 'v', titel: 'Vorlesung' }))).toBe(true);
    expect(hatStatus(event({ id: 't', titel: 'Tutorium' }))).toBe(false);
  });
});

describe('effektiverStatus', () => {
  it('nimmt den gespeicherten Status', () => {
    expect(effektiverStatus('abgabe', 'angefangen', STANDARD_EINSTELLUNGEN)).toBe('angefangen');
    expect(effektiverStatus('vorlesung', 'erledigt', STANDARD_EINSTELLUNGEN)).toBe('erledigt');
  });

  it('fällt ohne Status auf den Standard zurück', () => {
    expect(effektiverStatus('abgabe', null, STANDARD_EINSTELLUNGEN)).toBe('ausstehend');
    expect(effektiverStatus('vorlesung', undefined, STANDARD_EINSTELLUNGEN)).toBe('nachzuarbeiten');
    expect(
      effektiverStatus('vorlesung', null, { ...STANDARD_EINSTELLUNGEN, vorlesungStandard: 'erledigt' }),
    ).toBe('erledigt');
  });

  it('ignoriert Status, die nicht zum Typ passen', () => {
    expect(effektiverStatus('vorlesung', 'abgegeben', STANDARD_EINSTELLUNGEN)).toBe('nachzuarbeiten');
    expect(effektiverStatus('abgabe', 'nachzuarbeiten', STANDARD_EINSTELLUNGEN)).toBe('ausstehend');
  });
});
