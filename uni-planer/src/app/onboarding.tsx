import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Fliesstext, Hinweis, Karte, Knopf } from '@/components/bausteine';
import { Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { useVerbindung } from '@/daten/verbindung';
import { useTheme } from '@/hooks/use-theme';
import { ImportFehler, ladeBeispieldaten, verbindeMoodle } from '@/import/importiere';

const SCHRITTE = [
  'Öffne in RWTHmoodle den Kalender und tippe unten auf „Exportieren“.',
  'Wähle bei den Veranstaltungen „Alle Termine“ und einen Zeitraum, dann „Kalender-URL abfragen“.',
  'Kopiere den angezeigten Link und füge ihn hier ein.',
];

export default function Onboarding() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const verbindung = useVerbindung();
  const [link, setLink] = useState('');
  const [laedt, setLaedt] = useState<'moodle' | 'beispiel' | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);

  // Erst weiter, wenn die Navigation den neuen Verbindungszustand kennt
  // (sonst leitet der Schutz der To-do-Liste wieder hierher um).
  useEffect(() => {
    if (!fertig || verbindung.art === 'keine') return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [fertig, verbindung.art]);

  async function ausfuehren(art: 'moodle' | 'beispiel') {
    setFehler(null);
    setLaedt(art);
    try {
      if (art === 'moodle') await verbindeMoodle(db, link);
      else await ladeBeispieldaten(db);
      await verbindung.neuLaden();
      meldeAenderung();
      setFertig(true);
    } catch (e) {
      setFehler(e instanceof ImportFehler ? e.message : 'Unerwarteter Fehler. Bitte versuche es erneut.');
    } finally {
      setLaedt(null);
    }
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.inhalt}>
      <Text style={[styles.titel, { color: theme.text }]}>Dein Semester als To-do-Liste</Text>
      <Fliesstext>
        Uni-Planer holt Vorlesungen und Abgaben aus deinem Moodle-Kalender und macht daraus eine
        To-do-Liste. Du musst nur noch abhaken.
      </Fliesstext>
      <Fliesstext sekundaer>
        Dein Kalender-Link wird nur auf diesem Gerät gespeichert und nirgendwohin geschickt außer an
        Moodle selbst.
      </Fliesstext>

      <Karte>
        <Text style={[styles.untertitel, { color: theme.text }]}>So findest du den Link</Text>
        {SCHRITTE.map((schritt, index) => (
          <View key={index} style={styles.schritt}>
            <Text style={[styles.nummer, { color: theme.akzentText, backgroundColor: theme.akzent }]}>
              {index + 1}
            </Text>
            <View style={styles.schrittText}>
              <Fliesstext>{schritt}</Fliesstext>
            </View>
          </View>
        ))}
      </Karte>

      <TextInput
        value={link}
        onChangeText={setLink}
        placeholder="https://moodle.rwth-aachen.de/calendar/export_execute.php?…"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        keyboardType="url"
        textContentType="URL"
        returnKeyType="go"
        onSubmitEditing={() => link.trim() && ausfuehren('moodle')}
        style={[styles.eingabe, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.rand }]}
      />

      {fehler && <Hinweis art="fehler">{fehler}</Hinweis>}

      <Knopf
        titel="Verbinden"
        laedt={laedt === 'moodle'}
        deaktiviert={!link.trim() || laedt !== null}
        onPress={() => ausfuehren('moodle')}
      />

      {__DEV__ && verbindung.art === 'keine' && (
        <View style={styles.entwicklung}>
          <Fliesstext sekundaer>Entwicklungsmodus: ohne echten Link testen.</Fliesstext>
          <Knopf
            titel="Beispieldaten laden"
            art="sekundaer"
            laedt={laedt === 'beispiel'}
            deaktiviert={laedt !== null}
            onPress={() => ausfuehren('beispiel')}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  titel: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  untertitel: { fontSize: 17, fontWeight: '600' },
  schritt: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  schrittText: { flex: 1 },
  nummer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
  },
  eingabe: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  entwicklung: { gap: Spacing.two, marginTop: Spacing.four },
});
