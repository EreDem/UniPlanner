// Ein Modul in den Einstellungen: Schalter für das ganze Modul, aufklappbar für
// Vorlesungen, Übungen und Abgaben einzeln.

import { useSQLiteContext } from 'expo-sqlite';
import { ChevronDown, ChevronUp } from '@/components/icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Schalter } from '@/components/bausteine';
import { modulFarbe } from '@/constants/farben';
import { Schrift, Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { setzeKategorieAusgeblendet, setzeModulAusgeblendet } from '@/db/repository';
import { useSchema, useTheme } from '@/hooks/use-theme';
import { KATEGORIE_TEXT, KATEGORIEN, type Kategorie, type Modul } from '@/model/types';

export function ModulEinstellung({ modul, trennlinie }: { modul: Modul; trennlinie: boolean }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const schema = useSchema();
  const [offen, setOffen] = useState(false);
  const ausgeblendet = KATEGORIEN.filter((kategorie) => modul.ausgeblendeteKategorien[kategorie]);
  const Pfeil = offen ? ChevronUp : ChevronDown;

  async function zeigeModul(anzeigen: boolean) {
    await setzeModulAusgeblendet(db, modul.id, !anzeigen);
    meldeAenderung();
  }

  async function zeigeKategorie(kategorie: Kategorie, anzeigen: boolean) {
    await setzeKategorieAusgeblendet(db, modul.id, kategorie, !anzeigen);
    meldeAenderung();
  }

  let zusammenfassung: string | null = null;
  if (modul.ausgeblendet) zusammenfassung = 'Ganzes Modul ausgeblendet';
  else if (!offen && ausgeblendet.length > 0) {
    zusammenfassung = `${ausgeblendet.map((kategorie) => KATEGORIE_TEXT[kategorie]).join(', ')} ausgeblendet`;
  }

  return (
    <View style={trennlinie && [styles.trennlinie, { borderTopColor: theme.linie }]}>
      <View style={styles.kopf}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: offen }}
          accessibilityHint="Vorlesungen, Übungen und Abgaben einzeln ein- oder ausblenden"
          onPress={() => setOffen(!offen)}
          style={({ pressed }) => [styles.aufklapper, { opacity: pressed ? 0.6 : 1 }]}>
          <View
            style={[
              styles.punkt,
              { backgroundColor: modulFarbe(modul.id, schema), opacity: modul.ausgeblendet ? 0.4 : 1 },
            ]}
          />
          <View style={styles.name}>
            <Text
              numberOfLines={1}
              style={[styles.text, styles.modulName, { color: modul.ausgeblendet ? theme.deaktiviertText : theme.text }]}>
              {modul.name}
              {modul.art ? ` (${modul.art})` : ''}
            </Text>
            {zusammenfassung && (
              <Text style={[styles.zusammenfassung, { color: theme.text2 }]}>{zusammenfassung}</Text>
            )}
          </View>
          <Pfeil size={18} color={theme.text2} strokeWidth={2.2} />
        </Pressable>
        <Schalter beschriftung={`${modul.name} anzeigen`} wert={!modul.ausgeblendet} onAendern={zeigeModul} />
      </View>

      {offen && (
        <View style={styles.kategorien}>
          {KATEGORIEN.map((kategorie) => (
            <View key={kategorie} style={styles.kategorie}>
              <Text style={[styles.text, { color: modul.ausgeblendet ? theme.text2 : theme.text }]}>
                {KATEGORIE_TEXT[kategorie]}
              </Text>
              <Schalter
                beschriftung={`${KATEGORIE_TEXT[kategorie]} von ${modul.name} anzeigen`}
                deaktiviert={modul.ausgeblendet}
                wert={!modul.ausgeblendeteKategorien[kategorie]}
                onAendern={(anzeigen) => zeigeKategorie(kategorie, anzeigen)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trennlinie: { borderTopWidth: StyleSheet.hairlineWidth },
  kopf: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 56, paddingVertical: 6 },
  aufklapper: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  punkt: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1, minWidth: 0 },
  text: { fontFamily: Schrift.mittel, fontSize: 15 },
  modulName: { fontFamily: Schrift.fett },
  zusammenfassung: { fontFamily: Schrift.mittel, fontSize: 12 },
  // Eingerückt auf Höhe des Modulnamens (Punkt + Abstand).
  kategorien: { paddingLeft: 10 + 10, paddingBottom: Spacing.two, gap: Spacing.two },
  kategorie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
});
