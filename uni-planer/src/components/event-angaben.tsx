// Eigene Angaben in der Detailansicht: kurze Notiz (alle Events) und Punkte (Abgaben).
// Gespeichert wird beim Tippen; ungültige Punkte werden nicht gespeichert.

import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useFeldStil } from '@/components/bausteine';
import { Radius, Schrift, Spacing } from '@/constants/theme';
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
    <View style={[styles.notizBox, { backgroundColor: theme.grund, borderColor: theme.feldRand }]}>
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
        placeholderTextColor={theme.text2}
        style={[styles.notizEingabe, { color: theme.text }]}
      />
      <Text
        accessibilityLabel={`${notiz.length} von ${MAX_NOTIZ_ZEICHEN} Zeichen`}
        style={[styles.zaehler, { color: notiz.length >= MAX_NOTIZ_ZEICHEN ? theme.gefahr : theme.text2 }]}>
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
  const feldStil = useFeldStil(fehler !== null);

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
      placeholderTextColor={theme.text2}
      style={[feldStil, styles.punkteEingabe]}
    />
  );

  return (
    <View style={styles.punkte}>
      <View style={styles.punkteZeile}>
        {feld(erreicht, 'Erreichte Punkte', (text) => aendere(text, max))}
        <Text style={[styles.schraegstrich, { color: theme.text2 }]}>/</Text>
        {feld(max, 'Maximale Punkte', (text) => aendere(erreicht, text))}
        <Text style={[styles.erklaerung, { color: theme.text2 }]}>erreicht / maximal</Text>
      </View>
      {fehler && <Text style={[styles.fehler, { color: theme.gefahr }]}>{fehler}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  notizBox: {
    borderRadius: Radius.feld,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
    paddingBottom: Spacing.two,
  },
  notizEingabe: {
    fontFamily: Schrift.mittel,
    fontSize: 15,
    minHeight: 44,
    textAlignVertical: 'top',
    padding: 0,
  },
  zaehler: { alignSelf: 'flex-end', fontFamily: Schrift.mittel, fontSize: 12 },
  punkte: { gap: Spacing.one },
  punkteZeile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  punkteEingabe: { width: 84, minHeight: 48, fontFamily: Schrift.fett, fontSize: 18, textAlign: 'center' },
  schraegstrich: { fontFamily: Schrift.normal, fontSize: 22 },
  erklaerung: { flex: 1, fontFamily: Schrift.mittel, fontSize: 13 },
  fehler: { fontFamily: Schrift.mittel, fontSize: 13 },
});
