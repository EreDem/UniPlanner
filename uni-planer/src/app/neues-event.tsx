import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Abschnittstitel, Chip, Hinweis, Knopf } from '@/components/bausteine';
import { Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { ladeModule, legeManuellesEventAn, legeModulAn } from '@/db/repository';
import { useTheme } from '@/hooks/use-theme';
import type { EventTyp, Modul } from '@/model/types';
import { formatiere, leseDatumZeit } from '@/zeit';

const NEUES_MODUL = '__neu__';

export default function NeuesEvent() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [module, setModule] = useState<Modul[]>([]);
  const [typ, setTyp] = useState<EventTyp>('abgabe');
  const [modulWahl, setModulWahl] = useState<string | null>(null);
  const [neuesModul, setNeuesModul] = useState('');
  const [titel, setTitel] = useState('');
  const [datum, setDatum] = useState(() => formatiere(Date.now(), 'dd.MM.yyyy'));
  const [frist, setFrist] = useState('23:59');
  const [beginn, setBeginn] = useState('10:30');
  const [ende, setEnde] = useState('12:00');
  const [raum, setRaum] = useState('');
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    ladeModule(db).then((geladen) => setModule(geladen.filter((modul) => !modul.ausgeblendet)));
  }, [db]);

  /** Prüft die Eingaben; gibt eine Fehlermeldung oder die Zeitpunkte zurück. */
  function pruefe(): string | { startMs: number; endeMs: number } {
    if (!titel.trim()) return 'Bitte einen Titel eingeben.';
    if (modulWahl === NEUES_MODUL && !neuesModul.trim()) return 'Bitte einen Namen für das neue Modul eingeben.';
    if (typ === 'abgabe') {
      const fristMs = leseDatumZeit(datum, frist);
      if (fristMs === null) return 'Bitte Datum als TT.MM.JJJJ und Uhrzeit als HH:MM eingeben.';
      return { startMs: fristMs, endeMs: fristMs };
    }
    const startMs = leseDatumZeit(datum, beginn);
    const endeMs = leseDatumZeit(datum, ende);
    if (startMs === null || endeMs === null) return 'Bitte Datum als TT.MM.JJJJ und Uhrzeiten als HH:MM eingeben.';
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
      placeholderTextColor={theme.textSecondary}
      {...props}
      style={[styles.eingabe, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.rand }, props.style]}
    />
  );

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.inhalt}>
      <Abschnittstitel>Typ</Abschnittstitel>
      <View style={styles.chips}>
        <Chip titel="Abgabe" aktiv={typ === 'abgabe'} onPress={() => setTyp('abgabe')} />
        <Chip titel="Vorlesung" aktiv={typ === 'vorlesung'} onPress={() => setTyp('vorlesung')} />
      </View>

      <Abschnittstitel>Modul</Abschnittstitel>
      <View style={styles.chips}>
        <Chip titel="Ohne Modul" aktiv={modulWahl === null} onPress={() => setModulWahl(null)} />
        {module.map((modul) => (
          <Chip key={modul.id} titel={modul.name} aktiv={modulWahl === modul.id} onPress={() => setModulWahl(modul.id)} />
        ))}
        <Chip titel="+ Neues Modul" aktiv={modulWahl === NEUES_MODUL} onPress={() => setModulWahl(NEUES_MODUL)} />
      </View>
      {modulWahl === NEUES_MODUL &&
        feld({ value: neuesModul, onChangeText: setNeuesModul, placeholder: 'Name des Moduls', autoFocus: true })}

      <Abschnittstitel>Titel</Abschnittstitel>
      {feld({
        value: titel,
        onChangeText: setTitel,
        placeholder: typ === 'abgabe' ? 'z. B. Übungsblatt 4' : 'z. B. Tutorium',
      })}

      <Abschnittstitel>{typ === 'abgabe' ? 'Deadline' : 'Termin'}</Abschnittstitel>
      <View style={styles.zeile}>
        <Beschriftet text="Datum">
          {feld({ value: datum, onChangeText: setDatum, placeholder: 'TT.MM.JJJJ', keyboardType: 'numbers-and-punctuation' })}
        </Beschriftet>
        {typ === 'abgabe' ? (
          <Beschriftet text="Uhrzeit">
            {feld({ value: frist, onChangeText: setFrist, placeholder: 'HH:MM', keyboardType: 'numbers-and-punctuation' })}
          </Beschriftet>
        ) : (
          <>
            <Beschriftet text="Beginn">
              {feld({ value: beginn, onChangeText: setBeginn, placeholder: 'HH:MM', keyboardType: 'numbers-and-punctuation' })}
            </Beschriftet>
            <Beschriftet text="Ende">
              {feld({ value: ende, onChangeText: setEnde, placeholder: 'HH:MM', keyboardType: 'numbers-and-punctuation' })}
            </Beschriftet>
          </>
        )}
      </View>

      {typ === 'vorlesung' && (
        <>
          <Abschnittstitel>Raum (optional)</Abschnittstitel>
          {feld({ value: raum, onChangeText: setRaum, placeholder: 'z. B. Hörsaal A' })}
        </>
      )}

      {fehler && <Hinweis art="fehler">{fehler}</Hinweis>}
      <Knopf titel="Speichern" laedt={speichert} onPress={speichern} style={styles.speichern} />
    </ScrollView>
  );
}

function Beschriftet({ text, children }: { text: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.beschriftet}>
      <Text style={[styles.beschriftung, { color: theme.textSecondary }]}>{text}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: Spacing.three, paddingTop: 0, gap: Spacing.two, paddingBottom: Spacing.six },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  eingabe: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: Spacing.three, fontSize: 15 },
  zeile: { flexDirection: 'row', gap: Spacing.two },
  beschriftet: { flex: 1, gap: Spacing.one },
  beschriftung: { fontSize: 13 },
  speichern: { marginTop: Spacing.four },
});
