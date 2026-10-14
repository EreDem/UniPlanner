// Verbindungszustand: Moodle-Link gespeichert, Beispieldaten geladen oder nichts davon.
// Davon hängt ab, ob das Onboarding gezeigt wird.

import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Db } from '@/db/db';
import { ladeAbrufInfo } from '@/db/repository';
import { domainVon, ladeMoodleLink } from '@/speicher/moodleLink';

export type Verbindungsart = 'moodle' | 'beispiel' | 'keine';

interface Verbindung {
  /** `null`, solange der Zustand noch geladen wird. */
  art: Verbindungsart | null;
  /** Nur die Domain des Links, nie der vollständige Link. */
  domain: string | null;
  neuLaden: () => Promise<void>;
}

const VerbindungKontext = createContext<Verbindung | null>(null);

type Stand = { art: Verbindungsart; domain: string | null };

async function ermittleStand(db: Db): Promise<Stand> {
  const link = await ladeMoodleLink().catch(() => null);
  const { beispieldaten } = await ladeAbrufInfo(db);
  return {
    art: link ? 'moodle' : beispieldaten ? 'beispiel' : 'keine',
    domain: link ? domainVon(link) : null,
  };
}

export function VerbindungProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [stand, setStand] = useState<Stand | null>(null);

  useEffect(() => {
    let aktiv = true;
    ermittleStand(db).then((neu) => {
      if (aktiv) setStand(neu);
    });
    return () => {
      aktiv = false;
    };
  }, [db]);

  const neuLaden = useCallback(async () => setStand(await ermittleStand(db)), [db]);

  return (
    <VerbindungKontext.Provider value={{ art: stand?.art ?? null, domain: stand?.domain ?? null, neuLaden }}>
      {children}
    </VerbindungKontext.Provider>
  );
}

export function useVerbindung(): Verbindung {
  const verbindung = useContext(VerbindungKontext);
  if (!verbindung) throw new Error('useVerbindung braucht einen VerbindungProvider.');
  return verbindung;
}
