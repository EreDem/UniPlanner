import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hinweis } from '@/components/bausteine';
import { BereichsListe, ListenKopf, ListenLeer } from '@/components/bereichs-liste';
import { LEISTE_HOEHE, RueckgaengigLeiste } from '@/components/rueckgaengig-leiste';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { useRueckgaengig } from '@/daten/rueckgaengig';
import type { AbrufInfo } from '@/db/repository';
import { useListenDaten } from '@/hooks/use-listen-daten';
import { useTheme } from '@/hooks/use-theme';
import { importiere } from '@/import/importiere';
import { baueToDoListe } from '@/model/types';
import { vorWieLange } from '@/zeit';

const ABSTAND_UNTEN = BottomTabInset + Spacing.three;

export default function ToDoListe() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { daten, eingabe, jetzt } = useListenDaten();
  const leisteSichtbar = useRueckgaengig() !== null;
  const [aktualisiert, setAktualisiert] = useState(false);

  async function aktualisieren() {
    setAktualisiert(true);
    try {
      await importiere(db);
    } catch {
      // Die Meldung steht nach dem Neuladen im Kopf der Liste.
    } finally {
      setAktualisiert(false);
      meldeAenderung();
    }
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.flaeche, { backgroundColor: theme.background }]}>
      {daten && eingabe && (
        <BereichsListe
          bereiche={baueToDoListe(eingabe)}
          gespeicherterStatus={daten.status}
          jetztMs={jetzt}
          abstandUnten={ABSTAND_UNTEN + 80}
          refreshControl={<RefreshControl refreshing={aktualisiert} onRefresh={aktualisieren} />}
          kopf={
            <ListenKopf titel="To-do">
              <Stand abruf={daten.abruf} jetztMs={jetzt} />
            </ListenKopf>
          }
          leer={
            <ListenLeer
              titel="Alles erledigt"
              text="Keine offenen Abgaben und nichts nachzuarbeiten. Zum Aktualisieren nach unten ziehen."
            />
          }
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Event hinzufügen"
        onPress={() => router.push('/neues-event')}
        style={({ pressed }) => [
          styles.plus,
          {
            backgroundColor: theme.akzent,
            opacity: pressed ? 0.85 : 1,
            bottom: ABSTAND_UNTEN + (leisteSichtbar ? LEISTE_HOEHE + Spacing.two : 0),
          },
        ]}>
        <Text style={[styles.plusText, { color: theme.akzentText }]}>+</Text>
      </Pressable>

      <RueckgaengigLeiste abstandUnten={ABSTAND_UNTEN} />
    </SafeAreaView>
  );
}

function Stand({ abruf, jetztMs }: { abruf: AbrufInfo; jetztMs: number }) {
  const theme = useTheme();
  const stand = abruf.letzterAbrufMs
    ? `Zuletzt aktualisiert: ${vorWieLange(abruf.letzterAbrufMs, jetztMs)}`
    : 'Noch nicht aktualisiert';

  return (
    <>
      <Text style={[styles.stand, { color: theme.textSecondary }]}>
        {abruf.beispieldaten ? `${stand} · Beispieldaten` : stand}
      </Text>
      {abruf.letzterFehler && (
        <Hinweis art="fehler">Letzte Aktualisierung fehlgeschlagen: {abruf.letzterFehler}</Hinweis>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1 },
  stand: { fontSize: 13 },
  plus: {
    position: 'absolute',
    right: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  plusText: { fontSize: 30, lineHeight: 32, fontWeight: '400' },
});
