import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Abschnittstitel, Fliesstext, Hinweis, Karte, Knopf, OptionZeile } from '@/components/bausteine';
import { NotizFeld, PunkteFeld } from '@/components/event-angaben';
import { modulFarbe } from '@/constants/farben';
import { Spacing } from '@/constants/theme';
import { meldeAenderung, useDatenVersion } from '@/daten/aenderungen';
import type { Db } from '@/db/db';
import {
  ladeEinstellungen,
  ladeEvent,
  ladeModule,
  ladeNutzerdaten,
  ladeStatus,
  loescheManuellesEvent,
  setzeEventAusgeblendet,
  setzeStatus,
} from '@/db/repository';
import { useJetzt } from '@/hooks/use-jetzt';
import { useTheme } from '@/hooks/use-theme';
import {
  anzeigeTitel,
  artText,
  effektiverStatus,
  istVorlesung,
  STATUS_TEXT,
  STATUS_WERTE,
  type Status,
} from '@/model/types';
import { formatiere, fristText, terminText } from '@/zeit';

async function ladeDaten(db: Db, id: string) {
  const [event, module, status, einstellungen, nutzerdaten] = await Promise.all([
    ladeEvent(db, id),
    ladeModule(db),
    ladeStatus(db),
    ladeEinstellungen(db),
    ladeNutzerdaten(db, id),
  ]);
  if (!event) return { event: null } as const;
  return {
    event,
    modul: module.find((modul) => modul.id === event.modulId) ?? null,
    status: effektiverStatus(event.typ, status.get(event.id), einstellungen),
    nutzerdaten,
  };
}

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const version = useDatenVersion();
  const jetzt = useJetzt();
  const [daten, setDaten] = useState<Awaited<ReturnType<typeof ladeDaten>> | null>(null);

  useEffect(() => {
    let aktiv = true;
    ladeDaten(db, id).then((geladen) => {
      if (aktiv) setDaten(geladen);
    });
    return () => {
      aktiv = false;
    };
  }, [db, id, version]);

  if (!daten) return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  if (!daten.event) {
    return (
      <View style={[styles.inhalt, { flex: 1, backgroundColor: theme.background }]}>
        <Fliesstext>Dieses Event gibt es nicht mehr.</Fliesstext>
      </View>
    );
  }
  const { event, modul, status, nutzerdaten } = daten;

  async function waehle(neu: Status) {
    await setzeStatus(db, event.id, neu);
    meldeAenderung();
  }

  async function ausblenden(ausgeblendet: boolean) {
    await setzeEventAusgeblendet(db, event.id, ausgeblendet);
    meldeAenderung();
  }

  function loeschen() {
    Alert.alert('Event löschen?', `„${event.titel}“ wird endgültig gelöscht.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await loescheManuellesEvent(db, event.id);
          meldeAenderung();
          router.back();
        },
      },
    ]);
  }

  const titel = anzeigeTitel(event);
  const art = artText(event);
  // Das Kürzel des Termins, z. B. „TU“; das Modul fasst Kurse wie „(VO) Analysis“ und „(TU) Analysis“ zusammen.
  const kuerzel = event.kuerzel ?? modul?.art ?? null;
  // Übungen, Tutorien usw. haben keinen Status.
  const hatStatus = event.typ === 'abgabe' || istVorlesung(event);
  const zeit =
    event.typ === 'abgabe'
      ? `Frist: ${fristText(event.startMs, jetzt)}`
      : terminText(event.startMs, event.endeMs);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.inhalt}>
      <View style={styles.modulZeile}>
        <View style={[styles.punkt, { backgroundColor: modulFarbe(event.modulId) }]} />
        <Text style={[styles.modul, { color: theme.textSecondary }]}>
          {modul?.name ?? 'Ohne Modul'}
          {kuerzel ? ` (${kuerzel})` : ''}
          {titel === art ? '' : ` · ${art}`}
          {event.quelle === 'manuell' ? ' · manuell' : ''}
        </Text>
      </View>
      <Text selectable style={[styles.titel, { color: theme.text }]}>
        {titel}
      </Text>
      <Fliesstext>{zeit}</Fliesstext>
      {event.raeume.length > 0 && <Fliesstext sekundaer>{event.raeume.join('\n')}</Fliesstext>}

      {event.entferntMs !== null && (
        <Hinweis>
          Dieses Event ist seit {formatiere(event.entferntMs, 'dd.MM.yyyy')} nicht mehr im Moodle-Kalender.
          Vielleicht wurde es verschoben oder abgesagt.
        </Hinweis>
      )}
      {event.ausgeblendet && <Hinweis>Ausgeblendet – erscheint nicht in der To-do-Liste.</Hinweis>}

      {hatStatus && (
        <>
          <Abschnittstitel>Status</Abschnittstitel>
          <Karte style={styles.engeKarte}>
            {STATUS_WERTE[event.typ].map((wert) => (
              <OptionZeile
                key={wert}
                titel={STATUS_TEXT[wert]}
                ausgewaehlt={wert === status}
                onPress={() => waehle(wert)}
              />
            ))}
          </Karte>
        </>
      )}

      {event.typ === 'abgabe' && (
        <>
          <Abschnittstitel>Punkte</Abschnittstitel>
          <PunkteFeld key={event.id} eventId={event.id} anfangswert={nutzerdaten} />
        </>
      )}

      <Abschnittstitel>Notiz</Abschnittstitel>
      <NotizFeld key={event.id} eventId={event.id} anfangswert={nutzerdaten.notiz} />

      {event.beschreibung && (
        <>
          <Abschnittstitel>Beschreibung</Abschnittstitel>
          <Text selectable style={[styles.beschreibung, { color: theme.text }]}>
            {event.beschreibung}
          </Text>
        </>
      )}

      <View style={styles.aktionen}>
        <Knopf
          titel={event.ausgeblendet ? 'Wieder einblenden' : 'Ausblenden'}
          art="sekundaer"
          onPress={() => ausblenden(!event.ausgeblendet)}
        />
        {event.quelle === 'manuell' && <Knopf titel="Löschen" art="gefahr" onPress={loeschen} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  modulZeile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  punkt: { width: 10, height: 10, borderRadius: 5 },
  modul: { fontSize: 14, fontWeight: '500', flex: 1 },
  titel: { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  beschreibung: { fontSize: 15, lineHeight: 22 },
  engeKarte: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, gap: 0 },
  aktionen: { gap: Spacing.two, marginTop: Spacing.four },
});
