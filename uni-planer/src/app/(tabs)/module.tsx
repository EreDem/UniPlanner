import { router } from 'expo-router';
import { ChevronRight, Clock } from '@/components/icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListenKopf, ListenLeer } from '@/components/bereichs-liste';
import { FortschrittsRing } from '@/components/fortschritt';
import { modulFarbe } from '@/constants/farben';
import { BottomTabInset, kartenSchatten, Rand, Radius, Schrift, Spacing, Typo } from '@/constants/theme';
import { useListenDaten } from '@/hooks/use-listen-daten';
import { useSchema, useTheme } from '@/hooks/use-theme';
import { formatiereProzent } from '@/model/angaben';
import { anzahlIn, baueModulListe, type ModulUebersicht } from '@/model/modul-uebersicht';

export default function ModuleListe() {
  const theme = useTheme();
  const { daten, eingabe } = useListenDaten();
  const uebersichten = daten && eingabe ? baueModulListe(eingabe, daten.nutzerdaten) : [];

  return (
    <SafeAreaView edges={['top']} style={[styles.flaeche, { backgroundColor: theme.grund }]}>
      {daten && (
        <FlatList
          data={uebersichten}
          keyExtractor={(uebersicht) => uebersicht.modul.id}
          contentContainerStyle={styles.liste}
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

function zaehle(anzahl: number, einzahl: string, mehrzahl: string): string {
  return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`;
}

function ModulZeile({ uebersicht }: { uebersicht: ModulUebersicht }) {
  const theme = useTheme();
  const schema = useSchema();
  const { modul, punkte, nachzuarbeiten } = uebersicht;
  const uebungen = anzahlIn(uebersicht, 'uebungen');
  const inhalt = [
    zaehle(anzahlIn(uebersicht, 'vorlesungen'), 'Vorlesung', 'Vorlesungen'),
    zaehle(anzahlIn(uebersicht, 'abgaben'), 'Abgabe', 'Abgaben'),
    uebungen > 0 ? zaehle(uebungen, 'Übung', 'Übungen') : null,
  ].filter((teil) => teil !== null);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/modul/[id]', params: { id: modul.id } })}
      style={({ pressed }) => [
        styles.zeile,
        kartenSchatten(schema),
        { backgroundColor: theme.flaeche, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.streifen, { backgroundColor: modulFarbe(modul.id, schema) }]} />
      <View style={styles.inhalt}>
        <Text numberOfLines={1} style={[Typo.eintrag, { color: theme.text }]}>
          {modul.name}
          {modul.art ? ` (${modul.art})` : ''}
        </Text>
        <Text style={[Typo.details, { color: theme.text2 }]}>{inhalt.join(' · ')}</Text>
        {nachzuarbeiten > 0 && (
          <View style={styles.rueckstand}>
            <Clock size={14} color={theme.rueckstand} strokeWidth={2.2} />
            <Text style={[styles.rueckstandText, { color: theme.rueckstand }]}>{nachzuarbeiten} nachzuarbeiten</Text>
          </View>
        )}
      </View>
      {punkte.prozent !== null && (
        <View
          accessibilityLabel={`Punkte: ${formatiereProzent(punkte.prozent)}`}
          style={[styles.prozent, { backgroundColor: theme.flaeche2 }]}>
          <FortschrittsRing prozent={punkte.prozent} />
          <Text style={[styles.prozentText, { color: theme.text }]}>{formatiereProzent(punkte.prozent)}</Text>
        </View>
      )}
      <ChevronRight size={20} color={theme.text2} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1 },
  liste: { flexGrow: 1, paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.two },
  zeile: {
    marginHorizontal: Rand.karte,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.karte,
    padding: 14,
    gap: 12,
  },
  streifen: { width: 6, alignSelf: 'stretch', borderRadius: 3 },
  inhalt: { flex: 1, minWidth: 0, gap: 2 },
  rueckstand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rueckstandText: { fontFamily: Schrift.fett, fontSize: 13 },
  prozent: {
    height: 36,
    borderRadius: 18,
    paddingLeft: 5,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  prozentText: { fontFamily: Schrift.fett, fontSize: 13, fontVariant: ['tabular-nums'] },
});
