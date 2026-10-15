// Modulseite: oben Klausurtermine und Zulassungskriterien, darunter alle bisherigen Events des Moduls,
// aufklappbar nach Vorlesungen, Abgaben und Übungen. Bei den Abgaben stehen die Gesamtpunkte (auch zugeklappt).

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronDown, ChevronUp } from '@/components/icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fliesstext } from '@/components/bausteine';
import { FortschrittsBalken } from '@/components/fortschritt';
import { ModulAngabenFelder } from '@/components/modul-angaben';
import { StatusAuswahl } from '@/components/status-auswahl';
import { ToDoZeile } from '@/components/todo-zeile';
import { modulFarbe } from '@/constants/farben';
import { Radius, Schrift, Spacing, Typo } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { ladeModulAngaben, setzeStatus } from '@/db/repository';
import { useListenDaten } from '@/hooks/use-listen-daten';
import { useSchema, useTheme } from '@/hooks/use-theme';
import {
  formatierePunkte,
  formatiereProzent,
  leseGrenzeProzent,
  type ModulAngaben,
  type Punkte,
  type PunkteSumme,
} from '@/model/angaben';
import { baueModulUebersicht } from '@/model/modul-uebersicht';
import {
  KATEGORIE_TEXT,
  KUERZEL_TEXT,
  statusNachAbhaken,
  type Kategorie,
  type Modul,
  type Status,
  type ToDoEintrag,
} from '@/model/types';

export default function ModulDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const schema = useSchema();
  const { daten, eingabe, jetzt } = useListenDaten();
  const [offen, setOffen] = useState<readonly Kategorie[]>([]);
  const [auswahl, setAuswahl] = useState<ToDoEintrag | null>(null);
  const [angaben, setAngaben] = useState<ModulAngaben | null>(null);
  const [zulassung, setZulassung] = useState<string | null>(null);

  // Einmal laden; danach halten die Felder ihren Text selbst und speichern beim Tippen.
  useEffect(() => {
    let aktiv = true;
    ladeModulAngaben(db, id).then((geladen) => {
      if (!aktiv) return;
      setAngaben(geladen);
      setZulassung(geladen.zulassungskriterien);
    });
    return () => {
      aktiv = false;
    };
  }, [db, id]);

  if (!daten || !eingabe) return <View style={{ flex: 1, backgroundColor: theme.grund }} />;
  const modul = daten.module.find((m) => m.id === id);
  if (!modul) {
    return (
      <View style={[styles.leer, { backgroundColor: theme.grund }]}>
        <Fliesstext>Dieses Modul gibt es nicht mehr.</Fliesstext>
      </View>
    );
  }
  const uebersicht = baueModulUebersicht(eingabe, modul, daten.nutzerdaten);

  function umschalten(kategorie: Kategorie) {
    setOffen((jetztOffen) =>
      jetztOffen.includes(kategorie) ? jetztOffen.filter((k) => k !== kategorie) : [...jetztOffen, kategorie],
    );
  }

  async function waehleStatus(eintrag: ToDoEintrag, status: Status) {
    setAuswahl(null);
    if (status === eintrag.status) return;
    await setzeStatus(db, eintrag.event.id, status);
    meldeAenderung();
  }

  const art = artZeile(modul);

  return (
    <>
      <Stack.Screen options={{ title: modul.name }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        style={{ backgroundColor: theme.grund }}
        contentContainerStyle={styles.inhalt}>
        {art && (
          <View style={styles.artZeile}>
            <View style={[styles.punkt, { backgroundColor: modulFarbe(modul.id, schema) }]} />
            <Text style={[styles.artText, { color: theme.text2 }]}>{art}</Text>
          </View>
        )}

        {angaben && (
          <ModulAngabenFelder
            key={modul.id}
            modulId={modul.id}
            anfangswerte={angaben}
            onAendern={(angabe, text) => angabe === 'zulassungskriterien' && setZulassung(text)}
          />
        )}

        {uebersicht.kategorien.map(({ kategorie, eintraege }) => {
          const istOffen = offen.includes(kategorie);
          const Pfeil = istOffen ? ChevronUp : ChevronDown;
          return (
            <View key={kategorie} style={[styles.kategorie, { backgroundColor: theme.flaeche }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: istOffen }}
                onPress={() => umschalten(kategorie)}
                style={({ pressed }) => [styles.kopf, { opacity: pressed ? 0.7 : 1 }]}>
                <View style={styles.kopfText}>
                  <View style={styles.kopfZeile}>
                    <Text style={[styles.kopfTitel, { color: theme.text }]}>{KATEGORIE_TEXT[kategorie]}</Text>
                    <Text style={[styles.kopfAnzahl, { color: theme.text2 }]}>{eintraege.length}</Text>
                  </View>
                  {kategorie === 'vorlesungen' && uebersicht.nachzuarbeiten > 0 && (
                    <Text style={[styles.rueckstand, { color: theme.rueckstand }]}>
                      {uebersicht.nachzuarbeiten} nachzuarbeiten
                    </Text>
                  )}
                </View>
                <Pfeil size={20} color={theme.text2} strokeWidth={2.2} />
              </Pressable>

              {kategorie === 'abgaben' && eintraege.length > 0 && (
                <PunkteUebersicht
                  punkte={uebersicht.punkte}
                  anzahl={eintraege.length}
                  grenze={leseGrenzeProzent(zulassung)}
                />
              )}

              {istOffen && eintraege.length === 0 && (
                <Text style={[Typo.details, { color: theme.text2 }]}>
                  Bisher keine {KATEGORIE_TEXT[kategorie]} in diesem Modul.
                </Text>
              )}
              {istOffen && eintraege.length > 0 && (
                <View style={styles.zeilen}>
                  {eintraege.map((eintrag) => (
                    <ToDoZeile
                      key={eintrag.event.id}
                      eintrag={eintrag}
                      bereich={kategorie === 'abgaben' ? 'abgaben' : 'nachzuarbeiten'}
                      jetztMs={jetzt}
                      kompakt
                      style={{ backgroundColor: theme.grund }}
                      onPress={() => router.push({ pathname: '/event/[id]', params: { id: eintrag.event.id } })}
                      onStatusPress={() => setAuswahl(eintrag)}
                      onAbhaken={() => waehleStatus(eintrag, statusNachAbhaken(eintrag.event.typ, eintrag.status))}
                      zusatz={
                        kategorie === 'abgaben' ? punkteText(daten.nutzerdaten.get(eintrag.event.id)) : undefined
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <StatusAuswahl
        eintrag={auswahl}
        onWaehle={(status) => auswahl && waehleStatus(auswahl, status)}
        onSchliessen={() => setAuswahl(null)}
      />
    </>
  );
}

/** „VO · Vorlesung“ aus dem Kürzel des Moduls, bei eigenen Modulen „Eigenes Modul“. */
function artZeile(modul: Modul): string | null {
  if (modul.art) return [modul.art, KUERZEL_TEXT[modul.art.toUpperCase()]].filter(Boolean).join(' · ');
  return modul.quelle === 'manuell' ? 'Eigenes Modul' : null;
}

function punkteText(punkte: Punkte | undefined): string {
  if (!punkte || (punkte.erreicht === null && punkte.max === null)) return 'Punkte: –';
  return `Punkte: ${formatierePunkte(punkte.erreicht) || '–'} / ${formatierePunkte(punkte.max) || '–'}`;
}

function PunkteUebersicht({ punkte, anzahl, grenze }: { punkte: PunkteSumme; anzahl: number; grenze: number | null }) {
  const theme = useTheme();
  if (punkte.bewertet === 0) {
    return (
      <Text style={[Typo.details, { color: theme.text2 }]}>
        Noch keine Punkte eingetragen. Trage sie in der Detailansicht einer Abgabe ein.
      </Text>
    );
  }

  const werte: [string, string][] = [
    ['Erzielt', formatierePunkte(punkte.erreicht)],
    ['Möglich', formatierePunkte(punkte.max)],
    ['Prozent', punkte.prozent === null ? '–' : formatiereProzent(punkte.prozent)],
  ];
  return (
    <View style={styles.punkte}>
      <View style={styles.kacheln}>
        {werte.map(([beschriftung, wert], index) => {
          const betont = index === werte.length - 1;
          return (
            <View
              key={beschriftung}
              style={[styles.kachel, { backgroundColor: betont ? theme.primaer : theme.flaeche2 }]}>
              <Text style={[styles.kachelBeschriftung, { color: betont ? theme.primaerText : theme.text2 }]}>
                {beschriftung}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.kachelWert, { color: betont ? theme.primaerText : theme.text }]}>
                {wert}
              </Text>
            </View>
          );
        })}
      </View>
      {punkte.prozent !== null && <FortschrittsBalken prozent={punkte.prozent} grenze={grenze} />}
      <View style={styles.punkteFuss}>
        <Text style={[styles.punkteHinweis, { color: theme.text2 }]}>
          {punkte.bewertet === anzahl
            ? `Aus allen ${anzahl} Abgaben`
            : `Aus ${punkte.bewertet} von ${anzahl} Abgaben mit eingetragenen Punkten`}
        </Text>
        {grenze !== null && (
          <Text style={[styles.grenze, { color: theme.text }]}>Grenze {String(grenze).replace('.', ',')} %</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inhalt: { paddingHorizontal: Spacing.three, paddingTop: Spacing.one, gap: Spacing.three, paddingBottom: Spacing.six },
  leer: { flex: 1, padding: Spacing.three },
  artZeile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.one },
  punkt: { width: 12, height: 12, borderRadius: 6 },
  artText: { fontFamily: Schrift.halbfett, fontSize: 14 },
  kategorie: { borderRadius: Radius.karte, padding: Spacing.three, gap: Spacing.three },
  kopf: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  kopfText: { flex: 1, gap: 2 },
  kopfZeile: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  kopfTitel: { fontFamily: Schrift.fett, fontSize: 18 },
  kopfAnzahl: { fontFamily: Schrift.halbfett, fontSize: 15 },
  rueckstand: { fontFamily: Schrift.fett, fontSize: 13 },
  zeilen: { gap: Spacing.two },
  punkte: { gap: Spacing.two },
  kacheln: { flexDirection: 'row', gap: Spacing.two },
  kachel: { flex: 1, borderRadius: Radius.feld, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  kachelBeschriftung: { fontFamily: Schrift.halbfett, fontSize: 12 },
  kachelWert: { fontFamily: Schrift.extrafett, fontSize: 22, fontVariant: ['tabular-nums'] },
  punkteFuss: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  punkteHinweis: { flex: 1, fontFamily: Schrift.mittel, fontSize: 12, lineHeight: 16 },
  grenze: { fontFamily: Schrift.fett, fontSize: 12 },
});
