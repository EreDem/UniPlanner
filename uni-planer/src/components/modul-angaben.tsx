// Eigene Angaben oben auf der Modulseite: Klausurtermine und Zulassungskriterien als einzeilige Felder.
// Gespeichert wird beim Tippen.

import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { speichereModulAngabe } from '@/db/repository';
import { useTheme } from '@/hooks/use-theme';
import { MAX_MODUL_ANGABE_ZEICHEN, type ModulAngabe, type ModulAngaben } from '@/model/angaben';

const FELDER: { angabe: ModulAngabe; titel: string; platzhalter: string }[] = [
  { angabe: 'klausurtermine', titel: 'Klausurtermine', platzhalter: 'z. B. 1. Termin 12.02., 2. Termin 20.03.' },
  {
    angabe: 'zulassungskriterien',
    titel: 'Zulassungskriterien',
    platzhalter: 'z. B. 50 % der Übungspunkte, falls es welche gibt',
  },
];

export function ModulAngabenFelder({ modulId, anfangswerte }: { modulId: string; anfangswerte: ModulAngaben }) {
  return (
    <View style={styles.felder}>
      {FELDER.map((feld) => (
        <AngabeFeld key={feld.angabe} modulId={modulId} anfangswert={anfangswerte[feld.angabe]} {...feld} />
      ))}
    </View>
  );
}

function AngabeFeld({
  modulId,
  angabe,
  titel,
  platzhalter,
  anfangswert,
}: {
  modulId: string;
  angabe: ModulAngabe;
  titel: string;
  platzhalter: string;
  anfangswert: string | null;
}) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [text, setText] = useState(anfangswert ?? '');

  function aendere(neu: string) {
    setText(neu);
    speichereModulAngabe(db, modulId, angabe, neu);
  }

  return (
    <View style={styles.feld}>
      <Text style={[styles.titel, { color: theme.textSecondary }]}>{titel}</Text>
      <TextInput
        accessibilityLabel={titel}
        value={text}
        onChangeText={aendere}
        maxLength={MAX_MODUL_ANGABE_ZEICHEN}
        returnKeyType="done"
        placeholder={platzhalter}
        placeholderTextColor={theme.textSecondary}
        style={[styles.eingabe, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.rand }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  felder: { marginHorizontal: Spacing.three, gap: Spacing.two },
  feld: { gap: Spacing.one },
  titel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  eingabe: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: Spacing.three, fontSize: 15 },
});
