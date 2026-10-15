/**
 * @jest-environment node
 */
// Diagnose mit echten Moodle-Daten: zeigt, wie der Import die Termine von heute und alle Termine
// mit Kürzel TU/UE einordnet. Läuft bewusst nicht bei `npm test` mit.
//
// Aufruf:  npx jest --testRegex "werkzeuge/diagnose-kalender\.ts$"
//
// Den Kalender-Link liest das Werkzeug aus der Umgebungsvariable MOODLE_URL oder aus der Datei
// `.local` (gitignored). Der Link enthält einen Zugangstoken und wird nie ausgegeben.

import { normalisiereMoodleLink } from '@/import/abruf';
import { parseIcs } from '@/import/parse';
import { verarbeite } from '@/import/verarbeite';
import { istVorlesung, kategorieVon, type RohEvent } from '@/model/types';
import { formatiere, tagesgrenzen } from '@/zeit';

const fs = require('node:fs') as {
  existsSync(pfad: string): boolean;
  readFileSync(pfad: string, kodierung: 'utf8'): string;
};

interface Antwort {
  statusCode?: number;
  headers: Record<string, string | string[] | undefined>;
  setEncoding(kodierung: 'utf8'): void;
  on(ereignis: 'data', aufruf: (teil: string) => void): void;
  on(ereignis: 'end', aufruf: () => void): void;
  resume(): void;
}
const https = require('node:https') as {
  get(url: string, aufruf: (antwort: Antwort) => void): { on(ereignis: 'error', aufruf: () => void): void };
};

// In Jest ist `fetch` durch jest-expo ersetzt, deshalb hier direkt über Node. Fehler ohne Link ausgeben.
function ladeText(url: string, umleitungen = 3): Promise<string> {
  return new Promise((erfolg, fehler) => {
    https
      .get(url, (antwort) => {
        const ziel = antwort.headers.location;
        const umleitung = antwort.statusCode && antwort.statusCode >= 300 && antwort.statusCode < 400;
        if (umleitung && typeof ziel === 'string' && umleitungen > 0) {
          antwort.resume();
          erfolg(ladeText(new URL(ziel, url).toString(), umleitungen - 1));
          return;
        }
        if (antwort.statusCode !== 200) {
          antwort.resume();
          fehler(new Error(`Abruf fehlgeschlagen (HTTP ${antwort.statusCode}).`));
          return;
        }
        let text = '';
        antwort.setEncoding('utf8');
        antwort.on('data', (teil) => (text += teil));
        antwort.on('end', () => erfolg(text));
      })
      .on('error', () => fehler(new Error('Keine Verbindung zum Moodle-Server.')));
  });
}

function ladeLink(): string {
  const umgebung = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
  if (umgebung.MOODLE_URL) return normalisiereMoodleLink(umgebung.MOODLE_URL);
  if (fs.existsSync('.local')) {
    // Ohne Anführungszeichen o. Ä. am Ende; normalisiereMoodleLink wirft Fehler ohne den Link.
    const treffer = /https:\/\/[^\s"'„“”<>]+/.exec(fs.readFileSync('.local', 'utf8'));
    if (treffer) return normalisiereMoodleLink(treffer[0]);
  }
  throw new Error('Kein Kalender-Link gefunden: MOODLE_URL setzen oder in .local eintragen.');
}

const zeit = (ms: number) => formatiere(ms, 'EEEEEE dd.MM. HH:mm');
const dauer = (r: RohEvent) => `${Math.round((r.endeMs - r.startMs) / 60_000)} min`;
const roh = (r: RohEvent) => `${zeit(r.startMs)} | ${dauer(r)} | SUMMARY "${r.titel}" | CATEGORIES "${r.kategorie ?? '–'}"`;

it('zeigt, wie der Import die Termine einordnet', async () => {
  const rohEvents = parseIcs(await ladeText(ladeLink()));
  const { events } = verarbeite(rohEvents);
  const heute = tagesgrenzen(Date.now());
  const istHeute = (ms: number) => ms >= heute.startMs && ms < heute.endeMs;
  const zeilen: string[] = [`${rohEvents.length} VEVENTs im Export, ${events.length} Events nach dem Import`];

  zeilen.push('', '== Rohdaten von heute (vor dem Zusammenführen) ==');
  for (const r of rohEvents.filter((r) => istHeute(r.startMs))) zeilen.push(roh(r));

  zeilen.push('', '== So ordnet die App die heutigen Events ein ==');
  for (const e of events.filter((e) => istHeute(e.startMs))) {
    zeilen.push(
      `${zeit(e.startMs)} | typ ${e.typ} | ${kategorieVon(e)} | istVorlesung ${istVorlesung(e)} | ` +
        `kuerzel ${e.kuerzel ?? '–'} | ausgeblendet ${e.ausgeblendet} | UIDs ${e.uids.length} | "${e.titel}"`,
    );
  }

  const tuUe = rohEvents.filter((r) => /\((TU|UE)\)/i.test(r.kategorie ?? ''));
  zeilen.push('', `== Termine mit (TU) oder (UE) in CATEGORIES: ${tuUe.length} ==`);
  for (const r of tuUe.slice(0, 15)) zeilen.push(roh(r));

  // Wiederkehrende Termine zusammengefasst: gleicher Titel, Kurs, Wochentag und Uhrzeit.
  const muster = new Map<string, number>();
  for (const r of rohEvents) {
    const schluessel = `${formatiere(r.startMs, 'EEEEEE HH:mm')} | ${dauer(r)} | "${r.titel}" | "${r.kategorie ?? '–'}"`;
    muster.set(schluessel, (muster.get(schluessel) ?? 0) + 1);
  }
  zeilen.push('', '== Alle Termine nach Titel, Kurs, Wochentag und Uhrzeit (Anzahl) ==');
  for (const [schluessel, anzahl] of [...muster].sort()) zeilen.push(`${anzahl}× ${schluessel}`);

  const kuerzel = new Map<string, number>();
  for (const e of events) {
    const schluessel = `${e.kuerzel ?? 'ohne'} / ${e.typ}`;
    kuerzel.set(schluessel, (kuerzel.get(schluessel) ?? 0) + 1);
  }
  zeilen.push('', '== Anzahl nach Kürzel / Typ ==', ...[...kuerzel].map(([k, n]) => `${k}: ${n}`));

  console.log(zeilen.join('\n'));
}, 60_000);
