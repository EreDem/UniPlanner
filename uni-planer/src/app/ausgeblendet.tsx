// Einstellungen → Ausgeblendet: vom Nutzer ausgeblendete Events wieder einblenden.

import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bezeichnung, ListenLeer } from '@/components/bereichs-liste';
import { LEISTE_HOEHE, RueckgaengigLeiste } from '@/components/rueckgaengig-leiste';
import { ToDoZeile } from '@/components/todo-zeile';
import { Rand, Schrift, Spacing } from '@/constants/theme';
import { meldeAenderung, useDatenVersion } from '@/daten/aenderungen';
import { zeigeRueckgaengig } from '@/daten/rueckgaengig';
import type { Db } from '@/db/db';
import {
  ladeEinstellungen,
  ladeModule,
  ladeStatus,
  ladeVomNutzerAusgeblendet,
  setzeEventAusgeblendet,
} from '@/db/repository';
import { useJetzt } from '@/hooks/use-jetzt';
import { useTheme } from '@/hooks/use-theme';
import { baueAusgeblendetListe, type ToDoEintrag } from '@/model/types';

async function ladeDaten(db: Db) {
  const [events, module, status, einstellungen] = await Promise.all([
    ladeVomNutzerAusgeblendet(db),
    ladeModule(db),
    ladeStatus(db),
    ladeEinstellungen(db),
  ]);
  return { events, module, status, einstellungen };
}

export default function Ausgeblendet() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const version = useDatenVersion();
  const jetzt = useJetzt();
  const abstandUnten = useSafeAreaInsets().bottom;
  const [daten, setDaten] = useState<Awaited<ReturnType<typeof ladeDaten>> | null>(null);

  useEffect(() => {
    let aktiv = true;
    ladeDaten(db).then((geladen) => {
      if (aktiv) setDaten(geladen);
    });
    return () => {
      aktiv = false;
    };
  }, [db, version]);

  async function einblenden(eintrag: ToDoEintrag) {
    const { id } = eintrag.event;
    await setzeEventAusgeblendet(db, id, false);
    meldeAenderung();
    zeigeRueckgaengig(`Eingeblendet: ${bezeichnung(eintrag)}`, async () => {
      await setzeEventAusgeblendet(db, id, true);
      meldeAenderung();
    });
  }

  if (!daten) return <View style={[styles.flaeche, { backgroundColor: theme.grund }]} />;
  const eintraege = baueAusgeblendetListe({ ...daten, jetztMs: jetzt });

  return (
    <View style={[styles.flaeche, { backgroundColor: theme.grund }]}>
      <FlatList
        data={eintraege}
        keyExtractor={(eintrag) => eintrag.event.id}
        contentContainerStyle={[styles.liste, { paddingBottom: abstandUnten + LEISTE_HOEHE + Spacing.five }]}
        ListHeaderComponent={
          eintraege.length > 0 ? (
            <Text style={[styles.hinweis, { color: theme.text2 }]}>
              Diese Events hast du ausgeblendet. „Einblenden“ holt sie zurück in die Listen.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <ListenLeer titel="Nichts ausgeblendet" text="Einzelne Events blendest du in ihrer Detailansicht aus." />
        }
        ListFooterComponent={
          <Text style={[styles.hinweis, styles.fuss, { color: theme.text2 }]}>
            Ganze Module oder ihre Vorlesungen, Übungen und Abgaben blendest du unter Einstellungen → Module ein und
            aus.
          </Text>
        }
        renderItem={({ item }) => (
          <ToDoZeile
            eintrag={item}
            bereich="abgaben"
            jetztMs={jetzt}
            style={styles.zeile}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.event.id } })}
            aktion={{ titel: 'Einblenden', onPress: () => einblenden(item) }}
          />
        )}
      />
      <RueckgaengigLeiste abstandUnten={abstandUnten + Spacing.three} />
    </View>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1 },
  liste: { flexGrow: 1, gap: Spacing.two },
  zeile: { marginHorizontal: Rand.karte },
  hinweis: {
    fontFamily: Schrift.mittel,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: Rand.titel,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  fuss: { fontSize: 13, paddingTop: Spacing.three },
});
