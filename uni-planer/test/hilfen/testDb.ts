// Ersatz für expo-sqlite in Jest auf Basis von node:sqlite (ab Node 22.5),
// damit Schema, Migration und Repository-Logik ohne Gerät testbar sind.

import type { Db } from '@/db/db';

type Wert = string | number | null;

interface NodeSqlite {
  DatabaseSync: new (pfad: string) => {
    exec(sql: string): void;
    prepare(sql: string): {
      run(...werte: Wert[]): { changes: number | bigint; lastInsertRowid: number | bigint };
      get(...werte: Wert[]): unknown;
      all(...werte: Wert[]): unknown[];
    };
  };
}

function ladeNodeSqlite(): NodeSqlite | null {
  try {
    return require('node:sqlite') as NodeSqlite;
  } catch {
    return null;
  }
}

export const nodeSqliteVerfuegbar = ladeNodeSqlite() !== null;

export function erzeugeTestDb(): Db {
  const sqlite = ladeNodeSqlite();
  if (!sqlite) throw new Error('node:sqlite nicht verfügbar (Node >= 22.5 nötig).');
  const db = new sqlite.DatabaseSync(':memory:');
  const werte = (parameter: unknown): Wert[] => {
    if (parameter === undefined) return [];
    const liste = (Array.isArray(parameter) ? parameter : [parameter]) as unknown[];
    return liste.map((wert) => (typeof wert === 'boolean' ? Number(wert) : (wert as Wert)));
  };

  const adapter = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, parameter?: unknown) {
      const ergebnis = db.prepare(sql).run(...werte(parameter));
      return { changes: Number(ergebnis.changes), lastInsertRowId: Number(ergebnis.lastInsertRowid) };
    },
    async getFirstAsync(sql: string, parameter?: unknown) {
      return db.prepare(sql).get(...werte(parameter)) ?? null;
    },
    async getAllAsync(sql: string, parameter?: unknown) {
      return db.prepare(sql).all(...werte(parameter));
    },
    async withTransactionAsync(aufgabe: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await aufgabe();
        db.exec('COMMIT');
      } catch (fehler) {
        db.exec('ROLLBACK');
        throw fehler;
      }
    },
  };
  return adapter as unknown as Db;
}
