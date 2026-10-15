import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Abschnittstitel, Fliesstext, Hinweis, Karte, Knopf, OptionZeile } from '@/components/bausteine';
import { ModulEinstellung } from '@/components/modul-einstellung';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { meldeAenderung, useDatenVersion } from '@/daten/aenderungen';
import { useVerbindung } from '@/daten/verbindung';
import type { Db } from '@/db/db';
import {
  ladeAbrufInfo,
  ladeEinstellungen,
  ladeModule,
  ladeVomNutzerAusgeblendet,
  loescheAlleDaten,
  speichereEinstellungen,
} from '@/db/repository';
import { useJetzt } from '@/hooks/use-jetzt';
import { useTheme } from '@/hooks/use-theme';
import { importiere } from '@/import/importiere';
import { baueAusgeblendetListe, type Einstellungen } from '@/model/types';
import { loescheMoodleLink } from '@/speicher/moodleLink';
import { formatiere, vorWieLange } from '@/zeit';

async function ladeDaten(db: Db) {
  const [einstellungen, module, abruf, ausgeblendet] = await Promise.all([
    ladeEinstellungen(db),
    ladeModule(db),
    ladeAbrufInfo(db),
    ladeVomNutzerAusgeblendet(db),
  ]);
  return { einstellungen, module, abruf, ausgeblendet };
}

export default function EinstellungenScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const version = useDatenVersion();
  const jetzt = useJetzt();
  const verbindung = useVerbindung();
  const [daten, setDaten] = useState<Awaited<ReturnType<typeof ladeDaten>> | null>(null);
  const [aktualisiert, setAktualisiert] = useState(false);

  useEffect(() => {
    let aktiv = true;
    ladeDaten(db).then((geladen) => {
      if (aktiv) setDaten(geladen);
    });
    return () => {
      aktiv = false;
    };
  }, [db, version]);

  async function aendere(aenderung: Partial<Einstellungen>) {
    await speichereEinstellungen(db, aenderung);
    meldeAenderung();
  }

  async function aktualisieren() {
    setAktualisiert(true);
    try {
      await importiere(db);
    } catch {
      // Die Meldung wird unter „Letzter Fehler“ angezeigt.
    } finally {
      setAktualisiert(false);
      meldeAenderung();
    }
  }

  function linkEntfernen() {
    Alert.alert('Link entfernen?', 'Deine Daten bleiben erhalten. Zum Aktualisieren musst du den Link neu eingeben.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entfernen',
        style: 'destructive',
        onPress: async () => {
          await loescheMoodleLink();
          await verbindung.neuLaden();
        },
      },
    ]);
  }

  function allesLoeschen() {
    Alert.alert(
      'Alle Daten löschen?',
      'Alle Events, Status, Einstellungen und der gespeicherte Moodle-Link werden von diesem Gerät gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: async () => {
            await loescheAlleDaten(db);
            await loescheMoodleLink();
            meldeAenderung();
            await verbindung.neuLaden();
          },
        },
      ],
    );
  }

  if (!daten) return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  const { einstellungen, module, abruf, ausgeblendet } = daten;
  const anzahlAusgeblendet = baueAusgeblendetListe({
    events: ausgeblendet,
    module,
    status: new Map(),
    einstellungen,
    jetztMs: jetzt,
  }).length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.inhalt}>
        <Text style={[styles.titel, { color: theme.text }]}>Einstellungen</Text>

        <Abschnittstitel>Moodle-Verbindung</Abschnittstitel>
        <Karte>
          {verbindung.art === 'moodle' && <Fliesstext>Verbunden mit {verbindung.domain ?? 'Moodle'}</Fliesstext>}
          {verbindung.art === 'beispiel' && <Fliesstext>Beispieldaten (Entwicklungsmodus)</Fliesstext>}
          {verbindung.art === 'keine' && <Fliesstext>Nicht verbunden</Fliesstext>}
          <Fliesstext sekundaer>Der Link wird nur auf diesem Gerät gespeichert.</Fliesstext>
          <Knopf
            titel={verbindung.art === 'moodle' ? 'Link ändern' : 'Mit Moodle verbinden'}
            art="sekundaer"
            onPress={() => router.push('/onboarding')}
          />
          {verbindung.art === 'moodle' && <Knopf titel="Link entfernen" art="gefahr" onPress={linkEntfernen} />}
        </Karte>

        <Abschnittstitel>Vorlesungen standardmäßig</Abschnittstitel>
        <Karte style={styles.engeKarte}>
          <OptionZeile
            titel="Nachzuarbeiten"
            ausgewaehlt={einstellungen.vorlesungStandard === 'nachzuarbeiten'}
            onPress={() => aendere({ vorlesungStandard: 'nachzuarbeiten' })}
          />
          <OptionZeile
            titel="Erledigt"
            ausgewaehlt={einstellungen.vorlesungStandard === 'erledigt'}
            onPress={() => aendere({ vorlesungStandard: 'erledigt' })}
          />
        </Karte>

        <Abschnittstitel>Anzeige</Abschnittstitel>
        <Karte>
          <View style={styles.schalterZeile}>
            <Text style={[styles.schalterText, { color: theme.text }]}>Nur Abgaben anzeigen</Text>
            <Switch value={einstellungen.nurAbgaben} onValueChange={(nurAbgaben) => aendere({ nurAbgaben })} />
          </View>
          {einstellungen.startdatumMs !== null && (
            <Fliesstext sekundaer>
              Termine aus Moodle vor dem {formatiere(einstellungen.startdatumMs, 'EEEEEE dd.MM.yyyy')} werden nicht
              angezeigt (Beginn der Woche, in der du die App eingerichtet hast).
            </Fliesstext>
          )}
        </Karte>

        <Abschnittstitel>Module</Abschnittstitel>
        <Karte>
          {module.length === 0 && <Fliesstext sekundaer>Noch keine Module.</Fliesstext>}
          {module.length > 0 && (
            <Fliesstext sekundaer>Antippen, um Vorlesungen, Übungen oder Abgaben einzeln auszublenden.</Fliesstext>
          )}
          {module.map((modul) => (
            <ModulEinstellung key={modul.id} modul={modul} />
          ))}
        </Karte>

        <Abschnittstitel>Ausgeblendet</Abschnittstitel>
        <Karte style={styles.engeKarte}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Zeigt einzeln ausgeblendete Events, um sie wieder einzublenden"
            onPress={() => router.push('/ausgeblendet')}
            style={({ pressed }) => [styles.menuZeile, pressed && { backgroundColor: theme.backgroundSelected }]}>
            <Text style={[styles.schalterText, { color: theme.text }]}>Ausgeblendete Events</Text>
            <Text style={[styles.menuAnzahl, { color: theme.textSecondary }]}>{anzahlAusgeblendet}</Text>
            <Text style={[styles.menuPfeil, { color: theme.textSecondary }]}>›</Text>
          </Pressable>
        </Karte>

        <Abschnittstitel>Aktualisieren</Abschnittstitel>
        <Karte>
          <Fliesstext>
            Letzter Abruf:{' '}
            {abruf.letzterAbrufMs
              ? `${vorWieLange(abruf.letzterAbrufMs, jetzt)} (${formatiere(abruf.letzterAbrufMs, 'dd.MM., HH:mm')})`
              : 'noch nie'}
          </Fliesstext>
          {abruf.letzterFehler && <Hinweis art="fehler">Letzter Fehler: {abruf.letzterFehler}</Hinweis>}
          <Knopf titel="Jetzt aktualisieren" laedt={aktualisiert} onPress={aktualisieren} />
        </Karte>

        <Abschnittstitel>Daten</Abschnittstitel>
        <Karte>
          <Fliesstext sekundaer>Löscht alles, was die App auf diesem Gerät gespeichert hat.</Fliesstext>
          <Knopf titel="Alle Daten löschen" art="gefahr" onPress={allesLoeschen} />
        </Karte>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  inhalt: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  titel: { fontSize: 32, fontWeight: '700' },
  engeKarte: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, gap: 0 },
  schalterZeile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  schalterText: { flex: 1, fontSize: 15 },
  menuZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
  },
  menuAnzahl: { fontSize: 15 },
  menuPfeil: { fontSize: 22, lineHeight: 24 },
});
