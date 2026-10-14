// Modulseite: oben Klausurtermine und Zulassungskriterien, darunter alle bisherigen Events des Moduls,
// aufklappbar nach Vorlesungen, Abgaben und Übungen. Bei den Abgaben stehen die Gesamtpunkte (auch zugeklappt).

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fliesstext } from '@/components/bausteine';
import { bezeichnung } from '@/components/bereichs-liste';
import { ModulAngabenFelder } from '@/components/modul-angaben';
import { StatusAuswahl } from '@/components/status-auswahl';
import { ToDoZeile } from '@/components/todo-zeile';
import { Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { ladeModulAngaben, setzeStatus } from '@/db/repository';
import { useListenDaten } from '@/hooks/use-listen-daten';
import { useTheme } from '@/hooks/use-theme';
import {
  formatierePunkte,
  formatiereProzent,
  type ModulAngaben,
  type Punkte,
  type PunkteSumme,
} from '@/model/angaben';
import { baueModulUebersicht } from '@/model/modul-uebersicht';
import { KATEGORIE_TEXT, type Kategorie, type Status, type ToDoEintrag } from '@/model/types';

export default function ModulDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const { daten, eingabe, jetzt } = useListenDaten();
  const [offen, setOffen] = useState<readonly Kategorie[]>([]);
  const [auswahl, setAuswahl] = useState<ToDoEintrag | null>(null);
  const [angaben, setAngaben] = useState<ModulAngaben | null>(null);

  // Einmal laden; danach halten die Felder ihren Text selbst und speichern beim Tippen.
  useEffect(() => {
    let aktiv = true;
    ladeModulAngaben(db, id).then((geladen) => {
      if (aktiv) setAngaben(geladen);
    });
    return () => {
      aktiv = false;
    };
  }, [db, id]);

  if (!daten || !eingabe) return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  const modul = daten.module.find((m) => m.id === id);
  if (!modul) {
    return (
      <View style={[styles.leer, { backgroundColor: theme.background }]}>
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

  return (
    <>
      <Stack.Screen options={{ title: modul.name }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.inhalt}>
        {angaben && <ModulAngabenFelder key={modul.id} modulId={modul.id} anfangswerte={angaben} />}

        {uebersicht.kategorien.map(({ kategorie, eintraege }) => {
          const istOffen = offen.includes(kategorie);
          return (
            <View key={kategorie} style={styles.kategorie}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: istOffen }}
                onPress={() => umschalten(kategorie)}
                style={({ pressed }) => [
                  styles.kopf,
                  { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
                ]}>
                <View style={styles.kopfZeile}>
                  <Text style={[styles.kopfTitel, { color: theme.text }]}>{KATEGORIE_TEXT[kategorie]}</Text>
                  <Text style={[styles.kopfAnzahl, { color: theme.textSecondary }]}>{eintraege.length}</Text>
                  <Text
                    style={[
                      styles.pfeil,
                      { color: theme.textSecondary, transform: [{ rotate: istOffen ? '-90deg' : '90deg' }] },
                    ]}>
                    ›
                  </Text>
                </View>
                {kategorie === 'vorlesungen' && uebersicht.nachzuarbeiten > 0 && (
                  <Text style={[styles.hinweis, { color: theme.warnungText }]}>
                    {uebersicht.nachzuarbeiten} nachzuarbeiten
                  </Text>
                )}
                {kategorie === 'abgaben' && eintraege.length > 0 && (
                  <PunkteUebersicht punkte={uebersicht.punkte} anzahl={eintraege.length} />
                )}
              </Pressable>

              {istOffen && eintraege.length === 0 && (
                <Text style={[styles.hinweis, styles.keineEvents, { color: theme.textSecondary }]}>
                  Bisher keine {KATEGORIE_TEXT[kategorie]} in diesem Modul.
                </Text>
              )}
              {istOffen &&
                eintraege.map((eintrag) => (
                  <ToDoZeile
                    key={eintrag.event.id}
                    eintrag={eintrag}
                    bereich={kategorie === 'abgaben' ? 'abgaben' : 'nachzuarbeiten'}
                    jetztMs={jetzt}
                    onPress={() => router.push({ pathname: '/event/[id]', params: { id: eintrag.event.id } })}
                    onStatusPress={() => setAuswahl(eintrag)}
                    zusatz={kategorie === 'abgaben' ? punkteText(daten.nutzerdaten.get(eintrag.event.id)) : undefined}
                  />
                ))}
            </View>
          );
        })}
      </ScrollView>

      <StatusAuswahl
        auswahl={auswahl && { titel: bezeichnung(auswahl), typ: auswahl.event.typ, status: auswahl.status }}
        onWaehle={(status) => auswahl && waehleStatus(auswahl, status)}
        onSchliessen={() => setAuswahl(null)}
      />
    </>
  );
}

function punkteText(punkte: Punkte | undefined): string {
  if (!punkte || (punkte.erreicht === null && punkte.max === null)) return 'Punkte: –';
  return `Punkte: ${formatierePunkte(punkte.erreicht) || '–'} / ${formatierePunkte(punkte.max) || '–'}`;
}

function PunkteUebersicht({ punkte, anzahl }: { punkte: PunkteSumme; anzahl: number }) {
  const theme = useTheme();
  if (punkte.bewertet === 0) {
    return (
      <Text style={[styles.hinweis, { color: theme.textSecondary }]}>
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
      <View style={styles.punkteZeile}>
        {werte.map(([beschriftung, wert]) => (
          <View key={beschriftung} style={styles.punkteWert}>
            <Text style={[styles.punkteBeschriftung, { color: theme.textSecondary }]}>{beschriftung}</Text>
            <Text style={[styles.punkteZahl, { color: theme.text }]}>{wert}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.hinweis, { color: theme.textSecondary }]}>
        {punkte.bewertet === anzahl
          ? `Aus allen ${anzahl} Abgaben`
          : `Aus ${punkte.bewertet} von ${anzahl} Abgaben mit eingetragenen Punkten`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inhalt: { paddingVertical: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  leer: { flex: 1, padding: Spacing.three },
  kategorie: { gap: Spacing.one },
  kopf: { marginHorizontal: Spacing.three, borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  kopfZeile: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  kopfTitel: { fontSize: 18, fontWeight: '700' },
  kopfAnzahl: { flex: 1, fontSize: 15, fontWeight: '500' },
  pfeil: { fontSize: 22, lineHeight: 24, width: 20, textAlign: 'center' },
  hinweis: { fontSize: 13 },
  keineEvents: { paddingHorizontal: Spacing.three + Spacing.three, paddingVertical: Spacing.one },
  punkte: { gap: Spacing.one },
  punkteZeile: { flexDirection: 'row', gap: Spacing.three },
  punkteWert: { flex: 1 },
  punkteBeschriftung: { fontSize: 12 },
  punkteZahl: { fontSize: 20, fontWeight: '700' },
});
