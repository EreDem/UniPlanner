// Ein Modul in den Einstellungen: Schalter für das ganze Modul, aufklappbar für
// Vorlesungen, Übungen und Abgaben einzeln.

import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { modulFarbe } from '@/constants/farben';
import { Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { setzeKategorieAusgeblendet, setzeModulAusgeblendet } from '@/db/repository';
import { useTheme } from '@/hooks/use-theme';
import { KATEGORIE_TEXT, KATEGORIEN, type Kategorie, type Modul } from '@/model/types';

export function ModulEinstellung({ modul }: { modul: Modul }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [offen, setOffen] = useState(false);
  const ausgeblendet = KATEGORIEN.filter((kategorie) => modul.ausgeblendeteKategorien[kategorie]);

  async function zeigeModul(anzeigen: boolean) {
    await setzeModulAusgeblendet(db, modul.id, !anzeigen);
    meldeAenderung();
  }

  async function zeigeKategorie(kategorie: Kategorie, anzeigen: boolean) {
    await setzeKategorieAusgeblendet(db, modul.id, kategorie, !anzeigen);
    meldeAenderung();
  }

  return (
    <View>
      <View style={styles.kopf}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: offen }}
          accessibilityHint="Vorlesungen, Übungen und Abgaben einzeln ein- oder ausblenden"
          onPress={() => setOffen(!offen)}
          style={({ pressed }) => [styles.aufklapper, { opacity: pressed ? 0.6 : 1 }]}>
          <View style={[styles.punkt, { backgroundColor: modulFarbe(modul.id) }]} />
          <View style={styles.name}>
            <Text style={[styles.text, { color: theme.text }]}>
              {modul.name}
              {modul.art ? <Text style={{ color: theme.textSecondary }}> ({modul.art})</Text> : null}
            </Text>
            {!offen && !modul.ausgeblendet && ausgeblendet.length > 0 && (
              <Text style={[styles.zusammenfassung, { color: theme.textSecondary }]}>
                {ausgeblendet.map((kategorie) => KATEGORIE_TEXT[kategorie]).join(', ')} ausgeblendet
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.pfeil,
              { color: theme.textSecondary, transform: [{ rotate: offen ? '-90deg' : '90deg' }] },
            ]}>
            ›
          </Text>
        </Pressable>
        <Switch accessibilityLabel={`${modul.name} anzeigen`} value={!modul.ausgeblendet} onValueChange={zeigeModul} />
      </View>

      {offen && (
        <View style={styles.kategorien}>
          {KATEGORIEN.map((kategorie) => (
            <View key={kategorie} style={styles.kategorie}>
              <Text style={[styles.text, { color: modul.ausgeblendet ? theme.textSecondary : theme.text }]}>
                {KATEGORIE_TEXT[kategorie]}
              </Text>
              <Switch
                accessibilityLabel={`${KATEGORIE_TEXT[kategorie]} von ${modul.name} anzeigen`}
                disabled={modul.ausgeblendet}
                value={!modul.ausgeblendeteKategorien[kategorie]}
                onValueChange={(anzeigen) => zeigeKategorie(kategorie, anzeigen)}
              />
            </View>
          ))}
          {modul.ausgeblendet && (
            <Text style={[styles.zusammenfassung, { color: theme.textSecondary }]}>
              Das ganze Modul ist ausgeblendet.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kopf: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  aufklapper: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  punkt: { width: 10, height: 10, borderRadius: 5 },
  name: { flex: 1 },
  text: { fontSize: 15 },
  zusammenfassung: { fontSize: 12 },
  pfeil: { fontSize: 22, lineHeight: 24, width: 20, textAlign: 'center' },
  // Eingerückt auf Höhe des Modulnamens (Punkt + Abstand).
  kategorien: { paddingLeft: 10 + Spacing.two, paddingBottom: Spacing.one },
  kategorie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 },
});
