import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { useDatenVersion } from '@/daten/aenderungen';
import type { Db } from '@/db/db';
import { ladeAbrufInfo, ladeEinstellungen, ladeEvents, ladeModule, ladeStatus } from '@/db/repository';
import { useJetzt } from '@/hooks/use-jetzt';
import type { ToDoEingabe } from '@/model/types';
import { tagesgrenzen } from '@/zeit';

async function ladeListenDaten(db: Db) {
  const [events, module, status, einstellungen, abruf] = await Promise.all([
    ladeEvents(db),
    ladeModule(db),
    ladeStatus(db),
    ladeEinstellungen(db),
    ladeAbrufInfo(db),
  ]);
  return { events, module, status, einstellungen, abruf };
}

/** Lädt alles für To-do- und Erledigt-Liste neu, sobald sich Daten ändern. */
export function useListenDaten() {
  const db = useSQLiteContext();
  const version = useDatenVersion();
  const jetzt = useJetzt();
  const [daten, setDaten] = useState<Awaited<ReturnType<typeof ladeListenDaten>> | null>(null);

  useEffect(() => {
    let aktiv = true;
    ladeListenDaten(db).then((geladen) => {
      if (aktiv) setDaten(geladen);
    });
    return () => {
      aktiv = false;
    };
  }, [db, version]);

  const eingabe: ToDoEingabe | null = daten && { ...daten, jetztMs: jetzt, heute: tagesgrenzen(jetzt) };
  return { daten, eingabe, jetzt };
}
