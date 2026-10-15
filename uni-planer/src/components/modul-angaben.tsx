// Eigene Angaben oben auf der Modulseite: Klausurtermine und Zulassungskriterien als einzeilige Felder.
// Gespeichert wird beim Tippen.

import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Karte, useFeldStil } from '@/components/bausteine';
import { Schrift, Spacing } from '@/constants/theme';
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

export function ModulAngabenFelder({
  modulId,
  anfangswerte,
  onAendern,
}: {
  modulId: string;
  anfangswerte: ModulAngaben;
  /** Meldet jede Änderung, z. B. damit die Zulassungsgrenze im Punktebalken mitläuft. */
  onAendern?: (angabe: ModulAngabe, text: string) => void;
}) {
  return (
    <Karte>
      {FELDER.map((feld) => (
        <AngabeFeld
          key={feld.angabe}
          modulId={modulId}
          anfangswert={anfangswerte[feld.angabe]}
          onAendern={onAendern}
          {...feld}
        />
      ))}
    </Karte>
  );
}

function AngabeFeld({
  modulId,
  angabe,
  titel,
  platzhalter,
  anfangswert,
  onAendern,
}: {
  modulId: string;
  angabe: ModulAngabe;
  titel: string;
  platzhalter: string;
  anfangswert: string | null;
  onAendern?: (angabe: ModulAngabe, text: string) => void;
}) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const feldStil = useFeldStil();
  const [text, setText] = useState(anfangswert ?? '');

  function aendere(neu: string) {
    setText(neu);
    speichereModulAngabe(db, modulId, angabe, neu);
    onAendern?.(angabe, neu);
  }

  return (
    <View style={styles.feld}>
      <Text style={[styles.titel, { color: theme.text2 }]}>{titel}</Text>
      <TextInput
        accessibilityLabel={titel}
        value={text}
        onChangeText={aendere}
        maxLength={MAX_MODUL_ANGABE_ZEICHEN}
        returnKeyType="done"
        placeholder={platzhalter}
        placeholderTextColor={theme.text2}
        style={feldStil}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  feld: { gap: Spacing.two },
  titel: { fontFamily: Schrift.halbfett, fontSize: 13 },
});
