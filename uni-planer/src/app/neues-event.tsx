// Neues Event als Blatt von unten: Typ, Modul, Titel und Termin. Datum und Uhrzeit kommen aus dem
// Wähler des Systems und werden als Berliner Zeit gelesen (siehe src/zeit.ts).

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Calendar, Clock, type LucideIcon } from '@/components/icons';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, Hinweis, Knopf } from '@/components/bausteine';
import { modulFarbe } from '@/constants/farben';
import { Radius, Schrift, Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { ladeModule, legeManuellesEventAn, legeModulAn } from '@/db/repository';
import { useSchema, useTheme } from '@/hooks/use-theme';
import type { EventTyp, Modul } from '@/model/types';
import { formatiere, leseDatumZeit } from '@/zeit';

const NEUES_MODUL = '__neu__';
const ZEITZONE = 'Europe/Berlin';

type ZeitFeld = 'datum' | 'frist' | 'beginn' | 'ende';

export default function NeuesEvent() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const schema = useSchema();
  const insets = useSafeAreaInsets();
  const [module, setModule] = useState<Modul[]>([]);
  const [typ, setTyp] = useState<EventTyp>('abgabe');
  const [modulWahl, setModulWahl] = useState<string | null>(null);
  const [neuesModul, setNeuesModul] = useState('');
  const [titel, setTitel] = useState('');
  const [geoeffnetMs] = useState(() => Date.now());
  const [zeiten, setZeiten] = useState<Record<ZeitFeld, string>>(() => ({
    datum: formatiere(geoeffnetMs, 'dd.MM.yyyy'),
    frist: '23:59',
    beginn: '10:30',
    ende: '12:00',
  }));
  const [raum, setRaum] = useState('');
  /** Offener Wähler auf iOS (Android öffnet einen Systemdialog). */
  const [iosWahl, setIosWahl] = useState<ZeitFeld | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    ladeModule(db).then((geladen) => setModule(geladen.filter((modul) => !modul.ausgeblendet)));
  }, [db]);

  /** Zeitpunkt eines Feldes als Datum für den Wähler; bei Uhrzeiten am gewählten Tag. */
  function wert(feld: ZeitFeld): Date {
    const uhrzeit = feld === 'datum' ? '12:00' : zeiten[feld];
    return new Date(leseDatumZeit(zeiten.datum, uhrzeit) ?? geoeffnetMs);
  }

  function uebernimm(feld: ZeitFeld, datum: Date) {
    const text = formatiere(datum.getTime(), feld === 'datum' ? 'dd.MM.yyyy' : 'HH:mm');
    setZeiten((alt) => ({ ...alt, [feld]: text }));
  }

  function oeffneWaehler(feld: ZeitFeld) {
    if (Platform.OS !== 'android') {
      setIosWahl(feld);
      return;
    }
    DateTimePickerAndroid.open({
      value: wert(feld),
      mode: feld === 'datum' ? 'date' : 'time',
      is24Hour: true,
      timeZoneName: ZEITZONE,
      onValueChange: (_ereignis, datum) => uebernimm(feld, datum),
    });
  }

  /** Prüft die Eingaben; gibt eine Fehlermeldung oder die Zeitpunkte zurück. */
  function pruefe(): string | { startMs: number; endeMs: number } {
    if (!titel.trim()) return 'Bitte einen Titel eingeben.';
    if (modulWahl === NEUES_MODUL && !neuesModul.trim()) return 'Bitte einen Namen für das neue Modul eingeben.';
    if (typ === 'abgabe') {
      const fristMs = leseDatumZeit(zeiten.datum, zeiten.frist);
      if (fristMs === null) return 'Bitte Datum und Uhrzeit wählen.';
      return { startMs: fristMs, endeMs: fristMs };
    }
    const startMs = leseDatumZeit(zeiten.datum, zeiten.beginn);
    const endeMs = leseDatumZeit(zeiten.datum, zeiten.ende);
    if (startMs === null || endeMs === null) return 'Bitte Datum und Uhrzeiten wählen.';
    if (endeMs <= startMs) return 'Das Ende muss nach dem Beginn liegen.';
    return { startMs, endeMs };
  }

  async function speichern() {
    const ergebnis = pruefe();
    if (typeof ergebnis === 'string') {
      setFehler(ergebnis);
      return;
    }
    setFehler(null);
    setSpeichert(true);
    try {
      const modulId = modulWahl === NEUES_MODUL ? await legeModulAn(db, neuesModul) : modulWahl;
      await legeManuellesEventAn(db, {
        typ,
        modulId,
        titel: titel.trim(),
        ...ergebnis,
        raum: typ === 'vorlesung' && raum.trim() ? raum.trim() : null,
      });
      meldeAenderung();
      router.back();
    } catch {
      setFehler('Speichern fehlgeschlagen. Bitte versuche es erneut.');
      setSpeichert(false);
    }
  }

  const feld = (props: TextInputProps) => (
    <TextInput
      placeholderTextColor={theme.text2}
      {...props}
      style={[styles.eingabe, { color: theme.text, backgroundColor: theme.blattFeld, borderColor: theme.chipRand }]}
    />
  );

  const zeitKnopf = (zeitFeld: ZeitFeld, Icon: LucideIcon, text: string, beschriftung: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${beschriftung}: ${text}. Ändern`}
      onPress={() => oeffneWaehler(zeitFeld)}
      style={({ pressed }) => [
        styles.eingabe,
        styles.zeitKnopf,
        { backgroundColor: theme.blattFeld, borderColor: theme.chipRand, opacity: pressed ? 0.7 : 1 },
      ]}>
      <Icon size={18} color={theme.text2} strokeWidth={2} />
      <Text style={[styles.zeitText, { color: theme.text }]}>{text}</Text>
    </Pressable>
  );

  const datumMs = leseDatumZeit(zeiten.datum, '12:00');
  const datumText = datumMs === null ? zeiten.datum : formatiere(datumMs, 'EEEEEE dd.MM.');

  return (
    <View style={[styles.flaeche, { backgroundColor: theme.schleier }]}>
      <Pressable
        accessibilityLabel="Abbrechen"
        style={{ height: insets.top + Spacing.three }}
        onPress={() => router.back()}
      />
      <View style={[styles.blatt, { backgroundColor: theme.blatt }]}>
        <View style={[styles.griff, { backgroundColor: theme.griff }]} />
        <View style={styles.kopf}>
          <Pressable accessibilityRole="button" hitSlop={12} onPress={() => router.back()} style={styles.abbrechen}>
            <Text style={[styles.abbrechenText, { color: theme.text }]}>Abbrechen</Text>
          </Pressable>
          <Text accessibilityRole="header" style={[styles.titel, { color: theme.text }]}>
            Neues Event
          </Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.inhalt}>
          <Gruppe titel="Typ">
            <View style={styles.chips}>
              <Chip titel="Abgabe" haken aktiv={typ === 'abgabe'} onPress={() => setTyp('abgabe')} />
              <Chip titel="Vorlesung" haken aktiv={typ === 'vorlesung'} onPress={() => setTyp('vorlesung')} />
            </View>
          </Gruppe>

          <Gruppe titel="Modul">
            <View style={styles.chips}>
              <Chip titel="Ohne Modul" aktiv={modulWahl === null} onPress={() => setModulWahl(null)} />
              {module.map((modul) => (
                <Chip
                  key={modul.id}
                  titel={modul.name}
                  farbe={modulFarbe(modul.id, schema)}
                  aktiv={modulWahl === modul.id}
                  onPress={() => setModulWahl(modul.id)}
                />
              ))}
              <Chip titel="+ Neues Modul" aktiv={modulWahl === NEUES_MODUL} onPress={() => setModulWahl(NEUES_MODUL)} />
            </View>
            {modulWahl === NEUES_MODUL &&
              feld({ value: neuesModul, onChangeText: setNeuesModul, placeholder: 'Name des Moduls', autoFocus: true })}
          </Gruppe>

          <Gruppe titel="Titel">
            {feld({
              value: titel,
              onChangeText: setTitel,
              placeholder: typ === 'abgabe' ? 'z. B. Übungsblatt 4' : 'z. B. Tutorium',
            })}
          </Gruppe>

          <Gruppe titel={typ === 'abgabe' ? 'Deadline' : 'Termin'}>
            {typ === 'abgabe' ? (
              <View style={styles.zeile}>
                {zeitKnopf('datum', Calendar, datumText, 'Datum')}
                {zeitKnopf('frist', Clock, zeiten.frist, 'Uhrzeit')}
              </View>
            ) : (
              <>
                {zeitKnopf('datum', Calendar, datumText, 'Datum')}
                <View style={styles.zeile}>
                  {zeitKnopf('beginn', Clock, `ab ${zeiten.beginn}`, 'Beginn')}
                  {zeitKnopf('ende', Clock, `bis ${zeiten.ende}`, 'Ende')}
                </View>
              </>
            )}
            <Text style={[styles.hinweis, { color: theme.text2 }]}>
              Öffnet den Datums- bzw. Uhrzeitwähler des Systems.
            </Text>
          </Gruppe>

          {typ === 'vorlesung' && (
            <Gruppe titel="Raum (optional)">
              {feld({ value: raum, onChangeText: setRaum, placeholder: 'z. B. Hörsaal A' })}
            </Gruppe>
          )}
        </ScrollView>

        <View style={[styles.fuss, { paddingBottom: insets.bottom + Spacing.three }]}>
          {fehler && <Hinweis art="fehler">{fehler}</Hinweis>}
          <Knopf titel="Speichern" gross laedt={speichert} onPress={speichern} />
        </View>
      </View>

      {Platform.OS !== 'android' && (
        <Modal visible={iosWahl !== null} transparent animationType="fade" onRequestClose={() => setIosWahl(null)}>
          <Pressable style={[styles.flaeche, { backgroundColor: theme.schleier }]} onPress={() => setIosWahl(null)} />
          {iosWahl && (
            <View style={[styles.iosBlatt, { backgroundColor: theme.flaeche, paddingBottom: insets.bottom + Spacing.three }]}>
              <DateTimePicker
                value={wert(iosWahl)}
                mode={iosWahl === 'datum' ? 'date' : 'time'}
                display="spinner"
                locale="de-DE"
                timeZoneName={ZEITZONE}
                themeVariant={schema}
                onValueChange={(_ereignis, datum) => uebernimm(iosWahl, datum)}
              />
              <Knopf titel="Fertig" onPress={() => setIosWahl(null)} />
            </View>
          )}
        </Modal>
      )}
    </View>
  );
}

function Gruppe({ titel, children }: { titel: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.gruppe}>
      <Text style={[styles.gruppenTitel, { color: theme.text2 }]}>{titel}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1 },
  blatt: { flex: 1, borderTopLeftRadius: Radius.blatt, borderTopRightRadius: Radius.blatt, overflow: 'hidden' },
  griff: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: 10 },
  kopf: { height: 56, justifyContent: 'center', alignItems: 'center' },
  abbrechen: { position: 'absolute', left: 20, top: 0, bottom: 0, justifyContent: 'center' },
  abbrechenText: { fontFamily: Schrift.halbfett, fontSize: 16 },
  titel: { fontFamily: Schrift.fett, fontSize: 18 },
  inhalt: { paddingHorizontal: 20, paddingTop: Spacing.two, paddingBottom: Spacing.four, gap: 20 },
  gruppe: { gap: 10 },
  gruppenTitel: { fontFamily: Schrift.halbfett, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  eingabe: {
    minHeight: 50,
    borderRadius: Radius.knopf,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontFamily: Schrift.halbfett,
    fontSize: 16,
  },
  zeile: { flexDirection: 'row', gap: 10 },
  zeitKnopf: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  zeitText: { fontFamily: Schrift.halbfett, fontSize: 16, fontVariant: ['tabular-nums'] },
  hinweis: { fontFamily: Schrift.mittel, fontSize: 12 },
  fuss: { paddingHorizontal: 20, paddingTop: Spacing.two, gap: Spacing.two },
  iosBlatt: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.blatt,
    borderTopRightRadius: Radius.blatt,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
});
