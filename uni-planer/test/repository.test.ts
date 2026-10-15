/**
 * @jest-environment node
 */
import { migriere, SCHEMA_VERSION, type Db } from '@/db/db';
import {
  ladeAbrufInfo,
  ladeAlleNutzerdaten,
  ladeEinstellungen,
  ladeErscheinungsbild,
  ladeEvent,
  ladeEvents,
  ladeModulAngaben,
  ladeModule,
  ladeNutzerdaten,
  ladeStatus,
  ladeVomNutzerAusgeblendet,
  legeManuellesEventAn,
  legeModulAn,
  loescheAlleDaten,
  loescheManuellesEvent,
  setzeAbrufErfolg,
  setzeEventAusgeblendet,
  setzeKategorieAusgeblendet,
  setzeModulAusgeblendet,
  setzeStatus,
  speichereEinstellungen,
  speichereErscheinungsbild,
  speichereImport,
  speichereModulAngabe,
  speichereNotiz,
  speicherePunkte,
} from '@/db/repository';
import { parseIcs } from '@/import/parse';
import { verarbeite } from '@/import/verarbeite';
import { KEINE_KATEGORIE_AUSGEBLENDET, type RohEvent } from '@/model/types';
import { berlinZuUtc } from '@/zeit';

import beispielIcs from './fixtures/beispiel.ics';
import schemaV1 from './fixtures/schema-v1.sql';
import { erzeugeTestDb, nodeSqliteVerfuegbar } from './hilfen/testDb';

// Di 13.10.2026, 12:00 Berliner Zeit.
const JETZT = berlinZuUtc(2026, 10, 13, 12, 0);
const uid = (nummer: number) => `${nummer}@moodle.example.org`;
const ROH = parseIcs(beispielIcs);

async function anzahl(db: Db, tabelle: string): Promise<number> {
  return (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${tabelle}`))!.n;
}

async function importiere(db: Db, roh: RohEvent[] = ROH, jetzt = JETZT) {
  await speichereImport(db, verarbeite(roh), jetzt);
}

(nodeSqliteVerfuegbar ? describe : describe.skip)('Repository', () => {
  let db: Db;

  beforeEach(async () => {
    db = erzeugeTestDb();
    await migriere(db);
  });

  it('legt das Schema an und migriert nur einmal', async () => {
    await migriere(db);
    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: SCHEMA_VERSION });
  });

  it('aktualisiert eine Datenbank von Version 1 auf denselben Stand wie eine neue', async () => {
    const spalten = async (d: Db) =>
      Promise.all(
        ['modul', 'event', 'event_uid', 'status', 'nutzerdaten', 'einstellung'].map((tabelle) =>
          d.getAllAsync(`SELECT '${tabelle}' AS tabelle, name, type, "notnull", dflt_value FROM pragma_table_info('${tabelle}')`),
        ),
      );

    // Ein Gerät mit Version 1 und vorhandenen Daten.
    const alt = erzeugeTestDb();
    await alt.execAsync(schemaV1);
    await alt.execAsync('PRAGMA user_version = 1');
    await alt.execAsync(`
      INSERT INTO modul (id, name, quelle, ausgeblendet) VALUES ('analysis', 'Analysis', 'moodle', 1);
      INSERT INTO event (id, typ, quelle, modul_id, titel, start_ms, ende_ms)
        VALUES ('alt', 'vorlesung', 'moodle', 'analysis', 'Analysis', 0, 1);
    `);

    await migriere(alt);
    expect(await alt.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: SCHEMA_VERSION });
    expect(await spalten(alt)).toEqual(await spalten(db));
    expect(await ladeEvent(alt, 'alt')).toMatchObject({ titel: 'Analysis', kuerzel: null });
    expect(await ladeModule(alt)).toEqual([
      expect.objectContaining({ id: 'analysis', ausgeblendet: true, ausgeblendeteKategorien: KEINE_KATEGORIE_AUSGEBLENDET }),
    ]);
  });

  it('speichert Notiz und Punkte und behält sie bei erneutem Import', async () => {
    await importiere(db);
    await speichereNotiz(db, uid(2008), 'Aufgabe 3 mit Lisa');
    await speicherePunkte(db, uid(2008), { erreicht: 7.5, max: 10 });
    await speichereNotiz(db, uid(2001), 'Folien 12–20');
    await importiere(db);

    expect(await ladeNutzerdaten(db, uid(2008))).toEqual({ notiz: 'Aufgabe 3 mit Lisa', erreicht: 7.5, max: 10 });
    expect(await ladeNutzerdaten(db, uid(2001))).toEqual({ notiz: 'Folien 12–20', erreicht: null, max: null });
    expect(await ladeNutzerdaten(db, uid(2010))).toEqual({ notiz: null, erreicht: null, max: null });
    expect(await ladeAlleNutzerdaten(db)).toEqual(
      new Map([
        [uid(2008), { notiz: 'Aufgabe 3 mit Lisa', erreicht: 7.5, max: 10 }],
        [uid(2001), { notiz: 'Folien 12–20', erreicht: null, max: null }],
      ]),
    );
  });

  it('ändert Notiz und Punkte unabhängig voneinander', async () => {
    await importiere(db);
    await speicherePunkte(db, uid(2008), { erreicht: 4, max: 10 });
    await speichereNotiz(db, uid(2008), 'neu');
    await speichereNotiz(db, uid(2008), '');
    await speicherePunkte(db, uid(2008), { erreicht: null, max: 10 });

    expect(await ladeNutzerdaten(db, uid(2008))).toEqual({ notiz: null, erreicht: null, max: 10 });
  });

  it('begrenzt die Notiz auf 50 Zeichen', async () => {
    await importiere(db);
    await speichereNotiz(db, uid(2008), 'x'.repeat(60));
    expect((await ladeNutzerdaten(db, uid(2008))).notiz).toHaveLength(50);
    await expect(
      db.runAsync("UPDATE nutzerdaten SET notiz = ? WHERE event_id = ?", ['y'.repeat(51), uid(2008)]),
    ).rejects.toThrow();
  });

  it('löscht Notiz und Punkte mit dem manuellen Event und mit allen Daten', async () => {
    const id = await legeManuellesEventAn(db, {
      typ: 'abgabe',
      modulId: null,
      titel: 'Probeklausur',
      startMs: JETZT,
      endeMs: JETZT,
      raum: null,
    });
    await speichereNotiz(db, id, 'mitnehmen');
    await loescheManuellesEvent(db, id);
    expect(await anzahl(db, 'nutzerdaten')).toBe(0);

    await importiere(db);
    await speicherePunkte(db, uid(2008), { erreicht: 1, max: 2 });
    await loescheAlleDaten(db);
    expect(await anzahl(db, 'nutzerdaten')).toBe(0);
  });

  it('speichert Klausurtermine und Zulassungskriterien pro Modul, unberührt vom Import', async () => {
    await importiere(db);
    expect(await ladeModulAngaben(db, 'analysis')).toEqual({ klausurtermine: null, zulassungskriterien: null });

    await speichereModulAngabe(db, 'analysis', 'klausurtermine', '1. Termin 12.02., 2. Termin 20.03.');
    await speichereModulAngabe(db, 'analysis', 'zulassungskriterien', '50 % der Übungspunkte');
    await speichereModulAngabe(db, 'datenbanken', 'zulassungskriterien', 'x'.repeat(150));
    await importiere(db);

    expect(await ladeModulAngaben(db, 'analysis')).toEqual({
      klausurtermine: '1. Termin 12.02., 2. Termin 20.03.',
      zulassungskriterien: '50 % der Übungspunkte',
    });
    expect((await ladeModulAngaben(db, 'datenbanken')).zulassungskriterien).toHaveLength(100);

    await speichereModulAngabe(db, 'analysis', 'klausurtermine', '   ');
    expect((await ladeModulAngaben(db, 'analysis')).klausurtermine).toBeNull();
  });

  it('blendet Kategorien eines Moduls einzeln aus, ohne dass der Import das ändert', async () => {
    await importiere(db);
    await setzeKategorieAusgeblendet(db, 'analysis', 'uebungen', true);
    await setzeKategorieAusgeblendet(db, 'analysis', 'abgaben', true);
    await setzeKategorieAusgeblendet(db, 'analysis', 'abgaben', false);
    await importiere(db);

    const analysis = (await ladeModule(db)).find((m) => m.id === 'analysis')!;
    expect(analysis.ausgeblendet).toBe(false);
    expect(analysis.ausgeblendeteKategorien).toEqual({ vorlesungen: false, uebungen: true, abgaben: false });
  });

  it('speichert das Kürzel und aktualisiert es beim Import', async () => {
    await importiere(db);
    expect((await ladeEvent(db, uid(2018)))!.kuerzel).toBe('TU');

    await importiere(db, ROH.map((r) => (r.uid === uid(2018) ? { ...r, kategorie: '(UE) Analysis' } : r)));
    expect((await ladeEvent(db, uid(2018)))!.kuerzel).toBe('UE');
  });

  it('speichert die Beispieldaten', async () => {
    await importiere(db);
    expect(await anzahl(db, 'modul')).toBe(3);
    expect(await anzahl(db, 'event')).toBe(16);
    expect(await anzahl(db, 'event_uid')).toBe(18);

    const analysis = await ladeEvent(db, uid(2001));
    expect(analysis).toMatchObject({
      typ: 'vorlesung',
      quelle: 'moodle',
      modulId: 'analysis',
      raeume: ['[1420|001] Hörsaal A', '[1420|002] Hörsaal B'],
      ausgeblendet: false,
      entferntMs: null,
    });
    expect((await ladeEvent(db, uid(2009)))!.ausgeblendet).toBe(true);
  });

  it('erhält den Status bei erneutem Import, auch wenn sich das Event ändert', async () => {
    await importiere(db);
    await setzeStatus(db, uid(2008), 'angefangen', JETZT);
    await setzeStatus(db, uid(2001), 'erledigt', JETZT);

    const geaendert = ROH.map((r) => (r.uid === uid(2008) ? { ...r, titel: 'Übungsblatt 1 (neu) ist fällig' } : r));
    await importiere(db, geaendert);
    await importiere(db, geaendert);

    expect(await ladeStatus(db)).toEqual(
      new Map([
        [uid(2008), 'angefangen'],
        [uid(2001), 'erledigt'],
      ]),
    );
    expect((await ladeEvent(db, uid(2008)))!.titel).toBe('Übungsblatt 1 (neu) ist fällig');
    expect(await anzahl(db, 'event')).toBe(16);
  });

  it('behält beim Upgrade vorhandene Status und erlaubt danach „verpasst“', async () => {
    const alt = erzeugeTestDb();
    await alt.execAsync(schemaV1);
    await alt.execAsync(`
      PRAGMA user_version = 1;
      PRAGMA foreign_keys = ON;
      INSERT INTO event (id, typ, quelle, titel, start_ms, ende_ms) VALUES ('blatt', 'abgabe', 'moodle', 'Blatt 1', 0, 0);
      INSERT INTO status (event_id, status, geaendert_ms) VALUES ('blatt', 'angefangen', 1);
    `);

    await migriere(alt);

    expect((await ladeStatus(alt)).get('blatt')).toBe('angefangen');
    await setzeStatus(alt, 'blatt', 'verpasst', JETZT);
    expect((await ladeStatus(alt)).get('blatt')).toBe('verpasst');
    // Der Fremdschlüssel zum Event gilt weiter: Löschen des Events nimmt den Status mit.
    await alt.runAsync("DELETE FROM event WHERE id = 'blatt'");
    expect(await anzahl(alt, 'status')).toBe(0);
  });

  it('speichert den Status „verpasst“', async () => {
    await importiere(db);
    await setzeStatus(db, uid(2008), 'verpasst', JETZT);
    expect((await ladeStatus(db)).get(uid(2008))).toBe('verpasst');
  });

  it('stellt mit null den Standardstatus wieder her (Rückgängig)', async () => {
    await importiere(db);
    await setzeStatus(db, uid(2008), 'abgegeben', JETZT);
    await setzeStatus(db, uid(2008), null);
    expect((await ladeStatus(db)).has(uid(2008))).toBe(false);
  });

  it('findet ein Event über irgendeine seiner UIDs wieder', async () => {
    await importiere(db);
    await setzeStatus(db, uid(2001), 'erledigt', JETZT);

    // Die erste UID fehlt im nächsten Export, die Übertragung (2002) ist noch da.
    await importiere(db, ROH.filter((r) => r.uid !== uid(2001)));

    expect(await anzahl(db, 'event')).toBe(16);
    expect((await ladeEvent(db, uid(2001)))!.raeume).toEqual(['[1420|002] Hörsaal B']);
    expect((await ladeStatus(db)).get(uid(2001))).toBe('erledigt');
  });

  it('legt für eine abgespaltene UID ein eigenes Event an', async () => {
    await importiere(db);
    await setzeStatus(db, uid(2001), 'erledigt', JETZT);

    const verschoben = ROH.map((r) => (r.uid === uid(2002) ? { ...r, startMs: r.startMs + 3_600_000, endeMs: r.endeMs + 3_600_000 } : r));
    await importiere(db, verschoben);

    expect(await anzahl(db, 'event')).toBe(17);
    expect((await ladeEvent(db, uid(2001)))!.raeume).toEqual(['[1420|001] Hörsaal A']);
    expect((await ladeEvent(db, uid(2002)))!.raeume).toEqual(['[1420|002] Hörsaal B']);
    expect((await ladeStatus(db)).get(uid(2001))).toBe('erledigt');
  });

  it('markiert verschwundene Events in der Zukunft, aber nicht vergangene', async () => {
    await importiere(db);
    const ohne = ROH.filter((r) => r.uid !== uid(2010) && r.uid !== uid(2009));
    const spaeter = berlinZuUtc(2026, 10, 14, 12, 0);
    await importiere(db, ohne, spaeter);

    expect((await ladeEvent(db, uid(2010)))!.entferntMs).toBe(spaeter);
    // „Gruppenanmeldung beginnt“ lag am 12.10. schon in der Vergangenheit.
    expect((await ladeEvent(db, uid(2009)))!.entferntMs).toBeNull();

    await importiere(db, ROH, spaeter);
    expect((await ladeEvent(db, uid(2010)))!.entferntMs).toBeNull();
  });

  it('liefert nur vom Nutzer ausgeblendete Events, keine Öffnungs-Marker', async () => {
    await importiere(db);
    // 2009 „Gruppenanmeldung beginnt“ ist vom Import ausgeblendet und gehört nicht dazu.
    expect(await ladeVomNutzerAusgeblendet(db)).toEqual([]);

    await setzeEventAusgeblendet(db, uid(2008), true);
    await setzeEventAusgeblendet(db, uid(2001), true);
    expect((await ladeVomNutzerAusgeblendet(db)).map((e) => e.id)).toEqual([uid(2001), uid(2008)]);

    await setzeEventAusgeblendet(db, uid(2001), false);
    await importiere(db);
    expect((await ladeVomNutzerAusgeblendet(db)).map((e) => e.id)).toEqual([uid(2008)]);
  });

  it('überschreibt ausgeblendet nicht, wenn der Nutzer es gesetzt hat', async () => {
    await importiere(db);
    await setzeEventAusgeblendet(db, uid(2008), true);
    await setzeEventAusgeblendet(db, uid(2009), false);
    await importiere(db);

    expect((await ladeEvent(db, uid(2008)))!.ausgeblendet).toBe(true);
    expect((await ladeEvent(db, uid(2009)))!.ausgeblendet).toBe(false);
  });

  it('fasst ausgeblendete Module beim Import nicht an', async () => {
    await importiere(db);
    await setzeModulAusgeblendet(db, 'datenbanken', true);
    await importiere(db);

    const module = await ladeModule(db);
    expect(module.map((m) => [m.id, m.ausgeblendet])).toEqual([
      ['analysis', false],
      ['datenbanken', true],
      ['spieleprogrammierung', false],
    ]);
  });

  it('lässt manuelle Events beim Import unverändert', async () => {
    await importiere(db);
    const modulId = await legeModulAn(db, 'Lerngruppe Mathe');
    const id = await legeManuellesEventAn(db, {
      typ: 'abgabe',
      modulId,
      titel: 'Probeklausur rechnen',
      startMs: berlinZuUtc(2026, 11, 2, 18, 0),
      endeMs: berlinZuUtc(2026, 11, 2, 18, 0),
      raum: null,
    });
    await setzeStatus(db, id, 'angefangen', JETZT);
    await importiere(db);

    expect(id).toMatch(/^manuell:[0-9a-f-]{36}$/);
    expect(await ladeEvent(db, id)).toMatchObject({ quelle: 'manuell', entferntMs: null, modulId: 'lerngruppe-mathe' });
    expect((await ladeStatus(db)).get(id)).toBe('angefangen');
    expect((await ladeModule(db)).find((m) => m.id === 'lerngruppe-mathe')?.quelle).toBe('manuell');

    await loescheManuellesEvent(db, id);
    expect(await ladeEvent(db, id)).toBeNull();
    expect((await ladeStatus(db)).has(id)).toBe(false);
  });

  it('löscht nur manuelle Events', async () => {
    await importiere(db);
    await loescheManuellesEvent(db, uid(2008));
    expect(await ladeEvent(db, uid(2008))).not.toBeNull();
  });

  it('verwendet beim Anlegen eines bekannten Modulnamens das vorhandene Modul', async () => {
    await importiere(db);
    expect(await legeModulAn(db, 'Datenbanken')).toBe('datenbanken');
    expect((await ladeModule(db)).find((m) => m.id === 'datenbanken')?.quelle).toBe('moodle');
  });

  it('speichert Einstellungen', async () => {
    expect(await ladeEinstellungen(db)).toEqual({
      vorlesungStandard: 'nachzuarbeiten',
      nurAbgaben: false,
      startdatumMs: null,
    });
    await speichereEinstellungen(db, { vorlesungStandard: 'erledigt', nurAbgaben: true, startdatumMs: JETZT });
    expect(await ladeEinstellungen(db)).toEqual({ vorlesungStandard: 'erledigt', nurAbgaben: true, startdatumMs: JETZT });

    await speichereEinstellungen(db, { startdatumMs: null });
    expect((await ladeEinstellungen(db)).startdatumMs).toBeNull();
  });

  it('speichert das Erscheinungsbild, Standard ist das System', async () => {
    expect(await ladeErscheinungsbild(db)).toBe('system');
    await speichereErscheinungsbild(db, 'dunkel');
    expect(await ladeErscheinungsbild(db)).toBe('dunkel');
    await speichereErscheinungsbild(db, 'hell');
    expect(await ladeErscheinungsbild(db)).toBe('hell');
    await speichereErscheinungsbild(db, 'system');
    expect(await ladeErscheinungsbild(db)).toBe('system');

    await speichereErscheinungsbild(db, 'dunkel');
    await loescheAlleDaten(db);
    expect(await ladeErscheinungsbild(db)).toBe('system');
  });

  it('löscht alle Daten', async () => {
    await importiere(db);
    await setzeStatus(db, uid(2008), 'abgegeben', JETZT);
    await setzeAbrufErfolg(db, JETZT);
    await loescheAlleDaten(db);

    expect(await ladeEvents(db)).toEqual([]);
    expect(await ladeModule(db)).toEqual([]);
    expect((await ladeStatus(db)).size).toBe(0);
    expect(await ladeAbrufInfo(db)).toEqual({ letzterAbrufMs: null, letzterFehler: null, beispieldaten: false });
  });
});
