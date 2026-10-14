// Eigene Angaben in der Detailansicht: kurze Notiz (alle Events) und Punkte (Abgaben).
// Gespeichert wird beim Tippen; ungültige Punkte werden nicht gespeichert.

import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { speicherePunkte, speichereNotiz } from '@/db/repository';
import { useTheme } from '@/hooks/use-theme';
import { formatierePunkte, MAX_NOTIZ_ZEICHEN, pruefePunkte, type Punkte } from '@/model/angaben';

export function NotizFeld({ eventId, anfangswert }: { eventId: string; anfangswert: string | null }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [notiz, setNotiz] = useState(anfangswert ?? '');

  function aendere(text: string) {
    setNotiz(text);
    speichereNotiz(db, eventId, text);
  }

  return (
    <View style={[styles.notizBox, { backgroundColor: theme.backgroundElement, borderColor: theme.rand }]}>
      <TextInput
        accessibilityLabel="Notiz"
        value={notiz}
        onChangeText={aendere}
        onEndEditing={meldeAenderung}
        maxLength={MAX_NOTIZ_ZEICHEN}
        multiline
        submitBehavior="blurAndSubmit"
        returnKeyType="done"
        placeholder="Kurze Notiz, z. B. „Folien 12–20 fehlen noch“"
        placeholderTextColor={theme.textSecondary}
        style={[styles.notizEingabe, { color: theme.text }]}
      />
      <Text
        accessibilityLabel={`${notiz.length} von ${MAX_NOTIZ_ZEICHEN} Zeichen`}
        style={[styles.zaehler, { color: notiz.length >= MAX_NOTIZ_ZEICHEN ? theme.gefahr : theme.textSecondary }]}>
        {notiz.length} / {MAX_NOTIZ_ZEICHEN}
      </Text>
    </View>
  );
}

export function PunkteFeld({ eventId, anfangswert }: { eventId: string; anfangswert: Punkte }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [erreicht, setErreicht] = useState(formatierePunkte(anfangswert.erreicht));
  const [max, setMax] = useState(formatierePunkte(anfangswert.max));
  const geprueft = pruefePunkte(erreicht, max);
  const fehler = 'fehler' in geprueft ? geprueft.fehler : null;

  function aendere(neuErreicht: string, neuMax: string) {
    setErreicht(neuErreicht);
    setMax(neuMax);
    const punkte = pruefePunkte(neuErreicht, neuMax);
    if (!('fehler' in punkte)) speicherePunkte(db, eventId, punkte);
  }

  const feld = (wert: string, beschriftung: string, onChange: (text: string) => void) => (
    <TextInput
      accessibilityLabel={beschriftung}
      value={wert}
      onChangeText={onChange}
      onEndEditing={meldeAenderung}
      keyboardType="decimal-pad"
      maxLength={8}
      placeholder="–"
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.punkteEingabe,
        {
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: fehler ? theme.gefahr : theme.rand,
        },
      ]}
    />
  );

  return (
    <View style={styles.punkte}>
      <View style={styles.punkteZeile}>
        {feld(erreicht, 'Erreichte Punkte', (text) => aendere(text, max))}
        <Text style={[styles.schraegstrich, { color: theme.textSecondary }]}>/</Text>
        {feld(max, 'Maximale Punkte', (text) => aendere(erreicht, text))}
      </View>
      {fehler && <Text style={[styles.fehler, { color: theme.gefahr }]}>{fehler}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  notizBox: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  notizEingabe: { fontSize: 15, minHeight: 44, textAlignVertical: 'top', padding: 0 },
  zaehler: { alignSelf: 'flex-end', fontSize: 12 },
  punkte: { gap: Spacing.one },
  punkteZeile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  punkteEingabe: {
    width: 80,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    fontSize: 17,
    textAlign: 'center',
  },
  schraegstrich: { fontSize: 22 },
  fehler: { fontSize: 13 },
});
