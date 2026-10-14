import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListenKopf, ListenLeer } from '@/components/bereichs-liste';
import { modulFarbe } from '@/constants/farben';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useListenDaten } from '@/hooks/use-listen-daten';
import { useTheme } from '@/hooks/use-theme';
import { formatiereProzent } from '@/model/angaben';
import { anzahlIn, baueModulListe, type ModulUebersicht } from '@/model/modul-uebersicht';

export default function ModuleListe() {
  const theme = useTheme();
  const { daten, eingabe } = useListenDaten();
  const uebersichten = daten && eingabe ? baueModulListe(eingabe, daten.nutzerdaten) : [];

  return (
    <SafeAreaView edges={['top']} style={[styles.flaeche, { backgroundColor: theme.background }]}>
      {daten && (
        <FlatList
          data={uebersichten}
          keyExtractor={(uebersicht) => uebersicht.modul.id}
          contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.four }}
          ListHeaderComponent={<ListenKopf titel="Module" />}
          ListEmptyComponent={
            <ListenLeer
              titel="Noch keine Module"
              text="Module erscheinen, sobald Termine aus Moodle importiert sind. Ausgeblendete Module stehen nicht hier."
            />
          }
          renderItem={({ item }) => <ModulZeile uebersicht={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function zaehle(anzahl: number, einzahl: string, mehrzahl: string): string | null {
  if (anzahl === 0) return null;
  return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`;
}

function ModulZeile({ uebersicht }: { uebersicht: ModulUebersicht }) {
  const theme = useTheme();
  const { modul, punkte, nachzuarbeiten } = uebersicht;
  const inhalt = [
    zaehle(anzahlIn(uebersicht, 'vorlesungen'), 'Vorlesung', 'Vorlesungen'),
    zaehle(anzahlIn(uebersicht, 'abgaben'), 'Abgabe', 'Abgaben'),
    zaehle(anzahlIn(uebersicht, 'uebungen'), 'Übung', 'Übungen'),
  ].filter((teil) => teil !== null);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/modul/[id]', params: { id: modul.id } })}
      style={({ pressed }) => [styles.zeile, { backgroundColor: pressed ? theme.backgroundSelected : theme.background }]}>
      <View style={[styles.streifen, { backgroundColor: modulFarbe(modul.id) }]} />
      <View style={styles.inhalt}>
        <Text numberOfLines={1} style={[styles.name, { color: theme.text }]}>
          {modul.name}
          {modul.art ? <Text style={{ color: theme.textSecondary }}> ({modul.art})</Text> : null}
        </Text>
        <Text style={[styles.details, { color: theme.textSecondary }]}>
          {inhalt.length > 0 ? inhalt.join(' · ') : 'Noch keine vergangenen Termine'}
        </Text>
        {nachzuarbeiten > 0 && (
          <Text style={[styles.details, { color: theme.warnungText }]}>{nachzuarbeiten} nachzuarbeiten</Text>
        )}
      </View>
      {punkte.prozent !== null && (
        <View style={[styles.prozent, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.prozentText, { color: theme.text }]}>{formatiereProzent(punkte.prozent)}</Text>
        </View>
      )}
      <Text style={[styles.pfeil, { color: theme.textSecondary }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1 },
  zeile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingRight: Spacing.three,
    gap: Spacing.two,
  },
  streifen: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginLeft: Spacing.three, marginRight: Spacing.one },
  inhalt: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  details: { fontSize: 13, lineHeight: 18 },
  prozent: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  prozentText: { fontSize: 13, fontWeight: '700' },
  pfeil: { fontSize: 24, lineHeight: 26 },
});
