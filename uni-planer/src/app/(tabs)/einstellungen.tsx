import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronRight, EyeOff, Link, Lock, RefreshCw } from '@/components/icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Abschnittstitel, Hinweis, Karte, Knopf, Schalter, Segment } from '@/components/bausteine';
import { ModulEinstellung } from '@/components/modul-einstellung';
import { BottomTabInset, Schrift, Spacing, Typo } from '@/constants/theme';
import { meldeAenderung, useDatenVersion } from '@/daten/aenderungen';
import { setzeErscheinungsbild, useErscheinungsbild, type Erscheinungsbild } from '@/daten/erscheinungsbild';
import { useVerbindung } from '@/daten/verbindung';
import type { Db } from '@/db/db';
import {
  ladeAbrufInfo,
  ladeEinstellungen,
  ladeModule,
  ladeVomNutzerAusgeblendet,
  loescheAlleDaten,
  speichereEinstellungen,
  speichereErscheinungsbild,
} from '@/db/repository';
import { useJetzt } from '@/hooks/use-jetzt';
import { useTheme } from '@/hooks/use-theme';
import { importiere } from '@/import/importiere';
import { baueAusgeblendetListe, type Einstellungen, type VorlesungStatus } from '@/model/types';
import { loescheMoodleLink } from '@/speicher/moodleLink';
import { formatiere, vorWieLange } from '@/zeit';

const VORLESUNG_STANDARD: readonly { wert: VorlesungStatus; titel: string }[] = [
  { wert: 'nachzuarbeiten', titel: 'Nachzuarbeiten' },
  { wert: 'erledigt', titel: 'Erledigt' },
];

const DARSTELLUNG: readonly { wert: Erscheinungsbild; titel: string }[] = [
  { wert: 'system', titel: 'System' },
  { wert: 'hell', titel: 'Hell' },
  { wert: 'dunkel', titel: 'Dunkel' },
];

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
  const erscheinungsbild = useErscheinungsbild();
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

  async function waehleErscheinungsbild(wert: Erscheinungsbild) {
    // Sofort umschalten, dann speichern.
    setzeErscheinungsbild(wert);
    await speichereErscheinungsbild(db, wert);
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
            setzeErscheinungsbild('system');
            meldeAenderung();
            await verbindung.neuLaden();
          },
        },
      ],
    );
  }

  if (!daten) return <View style={{ flex: 1, backgroundColor: theme.grund }} />;
  const { einstellungen, module, abruf, ausgeblendet } = daten;
  const anzahlAusgeblendet = baueAusgeblendetListe({
    events: ausgeblendet,
    module,
    status: new Map(),
    einstellungen,
    jetztMs: jetzt,
  }).length;

  let verbindungTitel = 'Nicht verbunden';
  let verbindungText: string | null = null;
  if (verbindung.art === 'moodle') {
    verbindungTitel = 'Verbunden';
    verbindungText = verbindung.domain ?? 'Moodle';
  } else if (verbindung.art === 'beispiel') {
    verbindungTitel = 'Beispieldaten';
    verbindungText = 'Entwicklungsmodus';
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.grund }}>
      <ScrollView contentContainerStyle={styles.inhalt}>
        <Text accessibilityRole="header" style={[Typo.titel, styles.titel, { color: theme.text }]}>
          Einstellungen
        </Text>

        <Abschnitt titel="Moodle-Verbindung">
          <Karte>
            <View style={styles.verbindung}>
              <View
                style={[
                  styles.verbindungSymbol,
                  { backgroundColor: verbindung.art === 'moodle' ? theme.erfolgHintergrund : theme.flaeche2 },
                ]}>
                <Link
                  size={18}
                  color={verbindung.art === 'moodle' ? theme.erfolgText : theme.text2}
                  strokeWidth={2.4}
                />
              </View>
              <View style={styles.verbindungText}>
                <Text style={[Typo.eintrag, { color: theme.text }]}>{verbindungTitel}</Text>
                {verbindungText && (
                  <Text style={[styles.domain, { color: theme.text2 }]}>{verbindungText}</Text>
                )}
              </View>
            </View>
            <View style={styles.schloss}>
              <Lock size={13} color={theme.text2} strokeWidth={2.2} />
              <Text style={[Typo.details, { color: theme.text2, flex: 1 }]}>
                Der Link wird nur auf diesem Gerät gespeichert.
              </Text>
            </View>
            <View style={styles.knopfZeile}>
              <Knopf
                titel={verbindung.art === 'moodle' ? 'Link ändern' : 'Mit Moodle verbinden'}
                art="sekundaer"
                style={styles.knopfHaelfte}
                onPress={() => router.push('/onboarding')}
              />
              {verbindung.art === 'moodle' && (
                <Knopf titel="Link entfernen" art="gefahr" style={styles.knopfHaelfte} onPress={linkEntfernen} />
              )}
            </View>
          </Karte>
        </Abschnitt>

        <Abschnitt titel="Vorlesungen standardmäßig">
          <Segment
            optionen={VORLESUNG_STANDARD}
            wert={einstellungen.vorlesungStandard}
            onAendern={(vorlesungStandard) => aendere({ vorlesungStandard })}
          />
        </Abschnitt>

        <Abschnitt titel="Anzeige">
          <Karte style={styles.engeKarte}>
            <View style={styles.schalterZeile}>
              <Text style={[Typo.eintrag, styles.schalterText, { color: theme.text }]}>Nur Abgaben anzeigen</Text>
              <Schalter
                beschriftung="Nur Abgaben anzeigen"
                wert={einstellungen.nurAbgaben}
                onAendern={(nurAbgaben) => aendere({ nurAbgaben })}
              />
            </View>
            {einstellungen.startdatumMs !== null && (
              <Text style={[Typo.details, { color: theme.text2 }]}>
                Termine aus Moodle vor dem {formatiere(einstellungen.startdatumMs, 'EEEEEE dd.MM.yyyy')} werden nicht
                angezeigt (Beginn der Woche, in der du die App eingerichtet hast).
              </Text>
            )}
          </Karte>
        </Abschnitt>

        <Abschnitt titel="Darstellung">
          <Segment optionen={DARSTELLUNG} wert={erscheinungsbild} onAendern={waehleErscheinungsbild} />
        </Abschnitt>

        <Abschnitt
          titel="Module"
          hinweis={module.length > 0 ? 'Antippen, um Vorlesungen, Übungen oder Abgaben einzeln auszublenden.' : undefined}>
          <Karte style={styles.modulKarte}>
            {module.length === 0 && <Text style={[Typo.details, { color: theme.text2 }]}>Noch keine Module.</Text>}
            {module.map((modul, index) => (
              <ModulEinstellung key={modul.id} modul={modul} trennlinie={index > 0} />
            ))}
          </Karte>
        </Abschnitt>

        <Abschnitt titel="Ausgeblendet">
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Zeigt einzeln ausgeblendete Events, um sie wieder einzublenden"
            onPress={() => router.push('/ausgeblendet')}
            style={({ pressed }) => [styles.menuZeile, { backgroundColor: theme.flaeche, opacity: pressed ? 0.7 : 1 }]}>
            <EyeOff size={20} color={theme.text2} strokeWidth={2} />
            <Text style={[Typo.eintrag, styles.schalterText, { color: theme.text }]}>Ausgeblendete Events</Text>
            <Text style={[styles.menuAnzahl, { color: theme.text2 }]}>{anzahlAusgeblendet}</Text>
            <ChevronRight size={20} color={theme.text2} strokeWidth={2.2} />
          </Pressable>
        </Abschnitt>

        <Abschnitt titel="Aktualisieren">
          <Karte>
            <Text style={[styles.abruf, { color: theme.text2 }]}>
              Letzter Abruf:{' '}
              {abruf.letzterAbrufMs
                ? `${vorWieLange(abruf.letzterAbrufMs, jetzt)} (${formatiere(abruf.letzterAbrufMs, 'dd.MM., HH:mm')})`
                : 'noch nie'}
            </Text>
            {abruf.letzterFehler && <Hinweis art="fehler">Letzter Fehler: {abruf.letzterFehler}</Hinweis>}
            <Knopf titel="Jetzt aktualisieren" icon={RefreshCw} laedt={aktualisiert} onPress={aktualisieren} />
          </Karte>
        </Abschnitt>

        <Abschnitt titel="Daten">
          <Karte>
            <Text style={[styles.abruf, { color: theme.text2 }]}>
              Löscht alles, was die App auf diesem Gerät gespeichert hat.
            </Text>
            <Knopf titel="Alle Daten löschen" art="gefahrUmriss" onPress={allesLoeschen} />
          </Karte>
        </Abschnitt>
      </ScrollView>
    </SafeAreaView>
  );
}

function Abschnitt({ titel, hinweis, children }: { titel: string; hinweis?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.abschnitt}>
      <View style={styles.abschnittKopf}>
        <Abschnittstitel>{titel}</Abschnittstitel>
        {hinweis && <Text style={[Typo.details, { color: theme.text2 }]}>{hinweis}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  inhalt: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.four, paddingBottom: BottomTabInset + Spacing.four },
  titel: { paddingHorizontal: Spacing.one, marginBottom: -Spacing.two },
  abschnitt: { gap: 10 },
  abschnittKopf: { paddingHorizontal: Spacing.one + 2, gap: Spacing.one },
  verbindung: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verbindungSymbol: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  verbindungText: { flex: 1, minWidth: 0 },
  domain: { fontFamily: Schrift.mittel, fontSize: 14 },
  schloss: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -Spacing.one },
  knopfZeile: { flexDirection: 'row', gap: Spacing.two },
  knopfHaelfte: { flex: 1 },
  engeKarte: { gap: Spacing.two },
  schalterZeile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 40 },
  schalterText: { flex: 1 },
  modulKarte: { paddingVertical: Spacing.one, gap: 0 },
  menuZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
  },
  menuAnzahl: { fontFamily: Schrift.halbfett, fontSize: 15 },
  abruf: { fontFamily: Schrift.mittel, fontSize: 14, lineHeight: 20 },
});
