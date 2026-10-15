import type { SQLiteDatabase } from 'expo-sqlite';

import kuerzel from './migrationen/002-kuerzel.sql';
import modulKategorien from './migrationen/003-modul-kategorien.sql';
import nutzerdaten from './migrationen/004-nutzerdaten.sql';
import modulAngaben from './migrationen/005-modul-angaben.sql';
import leer from './migrationen/006-leer.sql';
import statusVerpasst from './migrationen/007-status-verpasst.sql';
import schema from './schema.sql';

export const DATENBANK_NAME = 'uniplaner.db';

/** Teilmenge von SQLiteDatabase, die das Repository nutzt (in Tests durch node:sqlite ersetzt). */
export type Db = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync' | 'withTransactionAsync'
>;

/**
 * Upgrades für bestehende Installationen: Eintrag n bringt die Datenbank von Version n - 1 auf n.
 * Nur anhängen, nie ändern. `schema.sql` enthält immer den vollständigen neuesten Stand.
 */
const UPGRADES: Readonly<Record<number, string>> = {
  2: kuerzel,
  3: modulKategorien,
  4: nutzerdaten,
  5: modulAngaben,
  6: leer,
  7: statusVerpasst,
};

export const SCHEMA_VERSION = 7;

/** Für `SQLiteProvider onInit`: Verbindung einstellen und Schema auf den neuesten Stand bringen. */
export async function migriere(db: Db): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const zeile = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = zeile?.user_version ?? 0;

  if (version === 0) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(schema);
      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    });
    return;
  }

  for (let ziel = version + 1; ziel <= SCHEMA_VERSION; ziel++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(UPGRADES[ziel]);
      await db.execAsync(`PRAGMA user_version = ${ziel}`);
    });
  }
}
