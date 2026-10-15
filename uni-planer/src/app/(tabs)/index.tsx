import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ArrowUpRight, Plus } from '@/components/icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hinweis } from '@/components/bausteine';
import { BereichsListe, ListenKopf, ListenLeer } from '@/components/bereichs-liste';
import { LEISTE_HOEHE, RueckgaengigLeiste } from '@/components/rueckgaengig-leiste';
import { BottomTabInset, Radius, Schrift, Spacing, Typo } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { useRueckgaengig } from '@/daten/rueckgaengig';
import { useVerbindung } from '@/daten/verbindung';
import type { AbrufInfo } from '@/db/repository';
import { useListenDaten } from '@/hooks/use-listen-daten';
import { useSchema, useTheme } from '@/hooks/use-theme';
import { importiere } from '@/import/importiere';
import { baueToDoListe } from '@/model/types';
import { moodleStartseite } from '@/speicher/moodleLink';
import { vorWieLange } from '@/zeit';

const ABSTAND_UNTEN = BottomTabInset + Spacing.three;

export default function ToDoListe() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const schema = useSchema();
  const { daten, eingabe, jetzt } = useListenDaten();
  const leisteSichtbar = useRueckgaengig() !== null;
  const verbindung = useVerbindung();
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

  const schwebend = schema === 'dark' ? null : styles.schatten;

  return (
    <SafeAreaView edges={['top']} style={[styles.flaeche, { backgroundColor: theme.grund }]}>
      {daten && eingabe && (
        <BereichsListe
          bereiche={baueToDoListe(eingabe)}
          gespeicherterStatus={daten.status}
          jetztMs={jetzt}
          abstandUnten={ABSTAND_UNTEN + 80}
          refreshControl={
            <RefreshControl
              refreshing={aktualisiert}
              onRefresh={aktualisieren}
              colors={[theme.text]}
              progressBackgroundColor={theme.flaeche}
              tintColor={theme.text2}
            />
          }
          kopf={
            <ListenKopf titel="To-do">
              <Stand abruf={daten.abruf} jetztMs={jetzt} aktualisiert={aktualisiert} />
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

      <View
        style={[styles.knoepfe, { bottom: ABSTAND_UNTEN + (leisteSichtbar ? LEISTE_HOEHE + Spacing.two : 0) }]}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Moodle im Browser öffnen"
          onPress={() => Linking.openURL(moodleStartseite(verbindung.domain)).catch(() => undefined)}
          style={({ pressed }) => [
            styles.moodle,
            schwebend,
            { backgroundColor: theme.flaeche, borderColor: theme.linie, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Text style={[styles.moodleText, { color: theme.text }]}>Zu Moodle</Text>
          <ArrowUpRight size={16} color={theme.text} strokeWidth={2.4} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Event hinzufügen"
          onPress={() => router.push('/neues-event')}
          style={({ pressed }) => [
            styles.plus,
            schwebend,
            { backgroundColor: theme.primaer, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Plus size={26} color={theme.primaerText} strokeWidth={2.4} />
        </Pressable>
      </View>

      <RueckgaengigLeiste abstandUnten={ABSTAND_UNTEN} />
    </SafeAreaView>
  );
}

function Stand({ abruf, jetztMs, aktualisiert }: { abruf: AbrufInfo; jetztMs: number; aktualisiert: boolean }) {
  const theme = useTheme();
  if (aktualisiert) {
    return (
      <View style={styles.standZeile}>
        <ActivityIndicator size="small" color={theme.text2} style={styles.standSpinner} />
        <Text style={[Typo.details, { color: theme.text2 }]}>Wird aktualisiert …</Text>
      </View>
    );
  }

  const stand = abruf.letzterAbrufMs
    ? `Zuletzt aktualisiert: ${vorWieLange(abruf.letzterAbrufMs, jetztMs)}`
    : 'Noch nicht aktualisiert';

  return (
    <>
      <Text style={[Typo.details, { color: theme.text2 }]}>
        {abruf.beispieldaten ? `${stand} · Beispieldaten` : stand}
      </Text>
      {abruf.letzterFehler && (
        <Hinweis art="fehler" style={styles.fehler}>
          <Text style={{ fontFamily: Schrift.fett }}>Letzte Aktualisierung fehlgeschlagen:</Text> {abruf.letzterFehler}
        </Hinweis>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1 },
  standZeile: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  standSpinner: { transform: [{ scale: 0.7 }], marginLeft: -4, marginRight: -2 },
  fehler: { marginTop: Spacing.two },
  knoepfe: {
    position: 'absolute',
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  moodle: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: 22,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  moodleText: { fontFamily: Schrift.fett, fontSize: 14 },
  plus: { width: 56, height: 56, borderRadius: Radius.karte + 2, alignItems: 'center', justifyContent: 'center' },
  schatten: {
    shadowColor: '#101828',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
