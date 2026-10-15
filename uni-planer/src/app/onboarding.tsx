import * as Clipboard from 'expo-clipboard';
import { router, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ListCheck, Lock } from '@/components/icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Hinweis, Knopf } from '@/components/bausteine';
import { Radius, Schrift, Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { useVerbindung } from '@/daten/verbindung';
import { useTheme } from '@/hooks/use-theme';
import { ImportFehler, ladeBeispieldaten, verbindeMoodle } from '@/import/importiere';

export default function Onboarding() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const verbindung = useVerbindung();
  const [link, setLink] = useState('');
  const [laedt, setLaedt] = useState<'moodle' | 'beispiel' | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState(false);
  // Aus den Einstellungen („Link ändern“) mit Kopfzeile und Zurück, beim ersten Start ohne.
  const [vonEinstellungen] = useState(() => router.canGoBack());

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

  async function einfuegen() {
    const text = await Clipboard.getStringAsync().catch(() => '');
    if (text) {
      setLink(text.trim());
      setFehler(null);
    }
  }

  const fett = (text: string) => <Text style={{ fontFamily: Schrift.fett }}>{text}</Text>;

  return (
    <SafeAreaView edges={vonEinstellungen ? ['bottom'] : ['top', 'bottom']} style={[styles.flaeche, { backgroundColor: theme.grund }]}>
      <Stack.Screen options={{ headerShown: vonEinstellungen }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.inhalt}>
        <View style={styles.marke}>
          <View style={[styles.logo, { backgroundColor: theme.primaer }]}>
            <ListCheck size={20} color={theme.primaerText} strokeWidth={2.4} />
          </View>
          <Text style={[styles.markenName, { color: theme.text }]}>Uni-Planer</Text>
        </View>

        <View style={styles.einleitung}>
          <Text accessibilityRole="header" style={[styles.titel, { color: theme.text }]}>
            Dein Semester als To-do-Liste
          </Text>
          <Text style={[styles.intro, { color: theme.text2 }]}>
            Uni-Planer holt Vorlesungen und Abgaben aus deinem Moodle-Kalender und macht daraus eine To-do-Liste. Du
            musst nur noch abhaken.
          </Text>
        </View>

        <View style={[styles.vertrauen, { backgroundColor: theme.flaeche2 }]}>
          <View style={[styles.schloss, { backgroundColor: theme.flaeche }]}>
            <Lock size={15} color={theme.text} strokeWidth={2.2} />
          </View>
          <Text style={[styles.vertrauenText, { color: theme.text }]}>
            Dein Kalender-Link wird nur auf diesem Gerät gespeichert und nirgendwohin geschickt außer an Moodle selbst.
          </Text>
        </View>

        <View style={[styles.anleitung, { backgroundColor: theme.flaeche }]}>
          <Text style={[styles.anleitungTitel, { color: theme.text }]}>So findest du den Link</Text>
          <Schritt nummer={1}>
            Öffne in RWTHmoodle den {fett('Kalender')} und tippe unten auf {fett('„Exportieren“')}.
          </Schritt>
          <Schritt
            nummer={2}
            zusatz={
              <View style={[styles.moodleBeispiel, { backgroundColor: theme.grund, borderColor: theme.chipRand }]}>
                <View style={[styles.moodleKnopf, { backgroundColor: theme.moodleKnopf }]}>
                  <Text style={styles.moodleKnopfText}>Kalender-URL abfragen</Text>
                </View>
                <Text style={[styles.moodleHinweis, { color: theme.text2 }]}>← diesen Knopf in Moodle</Text>
              </View>
            }>
            Wähle {fett('„Alle Termine“')} und einen Zeitraum, dann:
          </Schritt>
          <Schritt nummer={3} letzter>
            Kopiere den angezeigten Link und füge ihn hier unten ein.
          </Schritt>
        </View>

        <View style={styles.abstand} />

        <View style={styles.eingabeBereich}>
          <Text style={[styles.label, { color: theme.text2 }]}>Kalender-Link</Text>
          <View
            style={[
              styles.eingabeZeile,
              { backgroundColor: theme.flaeche, borderColor: fehler ? theme.gefahr : theme.linie },
              fehler ? styles.eingabeFehler : null,
            ]}>
            <TextInput
              accessibilityLabel="Kalender-Link"
              value={link}
              onChangeText={setLink}
              placeholder="https://moodle.rwth-aachen.de/calendar/…"
              placeholderTextColor={theme.text2}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              keyboardType="url"
              textContentType="URL"
              returnKeyType="go"
              numberOfLines={1}
              onSubmitEditing={() => link.trim() && ausfuehren('moodle')}
              style={[styles.eingabe, { color: theme.text }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Link aus der Zwischenablage einfügen"
              onPress={einfuegen}
              style={({ pressed }) => [styles.einfuegen, { backgroundColor: theme.flaeche2, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.einfuegenText, { color: theme.text }]}>Einfügen</Text>
            </Pressable>
          </View>

          {fehler && <Hinweis art="fehler">{fehler}</Hinweis>}

          <Knopf
            titel="Verbinden"
            gross
            laedt={laedt === 'moodle'}
            deaktiviert={!link.trim() || laedt !== null}
            onPress={() => ausfuehren('moodle')}
          />

          {__DEV__ && verbindung.art === 'keine' && (
            <Knopf
              titel="Beispieldaten laden (Entwicklung)"
              art="sekundaer"
              laedt={laedt === 'beispiel'}
              deaktiviert={laedt !== null}
              onPress={() => ausfuehren('beispiel')}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Schritt({
  nummer,
  children,
  zusatz,
  letzter = false,
}: {
  nummer: number;
  children: ReactNode;
  zusatz?: ReactNode;
  letzter?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.schritt}>
      <View style={styles.schrittLeiste}>
        <View style={[styles.nummer, { backgroundColor: theme.primaer }]}>
          <Text style={[styles.nummerText, { color: theme.primaerText }]}>{nummer}</Text>
        </View>
        {!letzter && <View style={[styles.verbinder, { backgroundColor: theme.linie }]} />}
      </View>
      <View style={styles.schrittInhalt}>
        <Text style={[styles.schrittText, { color: theme.text }]}>{children}</Text>
        {zusatz}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1 },
  inhalt: { flexGrow: 1, paddingHorizontal: 24, paddingTop: Spacing.three, paddingBottom: Spacing.three, gap: Spacing.three },
  marke: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  markenName: { fontFamily: Schrift.fett, fontSize: 17 },
  einleitung: { gap: 10 },
  titel: { fontFamily: Schrift.extrafett, fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  intro: { fontFamily: Schrift.normal, fontSize: 16, lineHeight: 23 },
  vertrauen: { flexDirection: 'row', gap: 12, borderRadius: Radius.karte, padding: 14, alignItems: 'flex-start' },
  schloss: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  vertrauenText: { flex: 1, fontFamily: Schrift.mittel, fontSize: 14, lineHeight: 20 },
  anleitung: { borderRadius: Radius.karte, padding: Spacing.three, gap: 0 },
  anleitungTitel: { fontFamily: Schrift.fett, fontSize: 15, marginBottom: 14 },
  schritt: { flexDirection: 'row', gap: 14 },
  schrittLeiste: { alignItems: 'center', width: 26 },
  nummer: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  nummerText: { fontFamily: Schrift.fett, fontSize: 13 },
  verbinder: { flex: 1, width: 2, borderRadius: 1, marginVertical: 4 },
  schrittInhalt: { flex: 1, gap: 10, paddingBottom: 16 },
  schrittText: { fontFamily: Schrift.normal, fontSize: 14, lineHeight: 20, marginTop: 3 },
  moodleBeispiel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.feld,
    padding: 10,
  },
  moodleKnopf: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 7 },
  moodleKnopfText: { color: '#FFFFFF', fontFamily: Schrift.fett, fontSize: 13 },
  moodleHinweis: { flex: 1, fontFamily: Schrift.mittel, fontSize: 12, lineHeight: 16 },
  abstand: { flexGrow: 1, minHeight: Spacing.two },
  eingabeBereich: { gap: 10 },
  label: { fontFamily: Schrift.halbfett, fontSize: 13 },
  eingabeZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: Radius.knopf,
    borderWidth: 1,
    paddingLeft: Spacing.three,
    paddingRight: 5,
    gap: Spacing.two,
  },
  eingabeFehler: { borderWidth: 2 },
  eingabe: { flex: 1, fontFamily: Schrift.mittel, fontSize: 15, paddingVertical: 10 },
  einfuegen: { minHeight: 40, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  einfuegenText: { fontFamily: Schrift.fett, fontSize: 14 },
});
