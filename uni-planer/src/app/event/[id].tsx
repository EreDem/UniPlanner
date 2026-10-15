import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Clock, Eye, EyeOff, MapPin, Trash2 } from '@/components/icons';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Abschnittstitel, Fliesstext, Hinweis, Karte, Knopf } from '@/components/bausteine';
import { NotizFeld, PunkteFeld } from '@/components/event-angaben';
import { StatusOptionen } from '@/components/status-auswahl';
import { modulFarbe } from '@/constants/farben';
import { Schrift, Spacing } from '@/constants/theme';
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
import { useSchema, useTheme } from '@/hooks/use-theme';
import { anzeigeTitel, artText, effektiverStatus, hatStatus, type Status } from '@/model/types';
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
  const schema = useSchema();
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

  if (!daten) return <View style={{ flex: 1, backgroundColor: theme.grund }} />;
  if (!daten.event) {
    return (
      <View style={[styles.inhalt, { flex: 1, backgroundColor: theme.grund }]}>
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
  const zeit =
    event.typ === 'abgabe'
      ? `Frist: ${fristText(event.startMs, jetzt)}`
      : terminText(event.startMs, event.endeMs);

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      style={{ backgroundColor: theme.grund }}
      contentContainerStyle={styles.inhalt}>
      <View style={styles.kopf}>
        <View style={styles.modulZeile}>
          <View style={[styles.punkt, { backgroundColor: modulFarbe(event.modulId, schema) }]} />
          <Text style={[styles.modul, { color: theme.text2 }]}>
            {modul?.name ?? 'Ohne Modul'}
            {kuerzel ? ` (${kuerzel})` : ''}
            {titel === art ? '' : ` · ${art}`}
            {event.quelle === 'manuell' ? ' · manuell' : ''}
          </Text>
        </View>
        <Text selectable accessibilityRole="header" style={[styles.titel, { color: theme.text }]}>
          {titel}
        </Text>
        <View style={styles.zeitZeile}>
          <Clock size={17} color={theme.text2} strokeWidth={2} />
          <Text style={[styles.zeit, { color: theme.text }]}>{zeit}</Text>
        </View>
        {event.raeume.length > 0 && (
          <View style={styles.zeitZeile}>
            <MapPin size={17} color={theme.text2} strokeWidth={2} />
            <Text style={[styles.zeit, { color: theme.text }]}>{event.raeume.join('\n')}</Text>
          </View>
        )}
      </View>

      {event.entferntMs !== null && (
        <Hinweis>
          Dieses Event ist seit {formatiere(event.entferntMs, 'dd.MM.yyyy')} nicht mehr im Moodle-Kalender.
          Vielleicht wurde es verschoben oder abgesagt.
        </Hinweis>
      )}
      {event.ausgeblendet && <Hinweis>Ausgeblendet – erscheint nicht in der To-do-Liste.</Hinweis>}

      {hatStatus(event) && (
        <Karte style={styles.statusKarte}>
          <Abschnittstitel style={styles.statusTitel}>Status</Abschnittstitel>
          <StatusOptionen
            typ={event.typ}
            status={status}
            onWaehle={waehle}
            hervorhebung={theme.grund}
            erklaerungen="noetige"
          />
        </Karte>
      )}

      {event.typ === 'abgabe' && (
        <Karte>
          <Abschnittstitel>Punkte</Abschnittstitel>
          <PunkteFeld key={event.id} eventId={event.id} anfangswert={nutzerdaten} />
        </Karte>
      )}

      <Karte>
        <Abschnittstitel>Notiz</Abschnittstitel>
        <NotizFeld key={event.id} eventId={event.id} anfangswert={nutzerdaten.notiz} />
      </Karte>

      {event.beschreibung && (
        <Karte style={styles.engeKarte}>
          <Abschnittstitel>{event.quelle === 'moodle' ? 'Beschreibung aus Moodle' : 'Beschreibung'}</Abschnittstitel>
          <Text selectable style={[styles.beschreibung, { color: theme.text }]}>
            {event.beschreibung}
          </Text>
        </Karte>
      )}

      <View style={styles.aktionen}>
        <Knopf
          titel={event.ausgeblendet ? 'Wieder einblenden' : 'Ausblenden'}
          icon={event.ausgeblendet ? Eye : EyeOff}
          art="sekundaer"
          gross
          onPress={() => ausblenden(!event.ausgeblendet)}
        />
        {event.quelle === 'manuell' && (
          <Knopf titel="Löschen" icon={Trash2} art="gefahrUmriss" gross onPress={loeschen} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inhalt: { paddingHorizontal: Spacing.three + 4, paddingTop: Spacing.two, gap: Spacing.three, paddingBottom: Spacing.six },
  kopf: { gap: Spacing.two, paddingBottom: Spacing.one },
  modulZeile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  punkt: { width: 10, height: 10, borderRadius: 5 },
  modul: { fontFamily: Schrift.halbfett, fontSize: 14, flex: 1 },
  titel: { fontFamily: Schrift.extrafett, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  zeitZeile: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two + 2 },
  zeit: { flex: 1, fontFamily: Schrift.halbfett, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
  statusKarte: { paddingHorizontal: Spacing.two, gap: Spacing.two },
  statusTitel: { paddingHorizontal: Spacing.two },
  engeKarte: { gap: Spacing.two },
  beschreibung: { fontFamily: Schrift.normal, fontSize: 15, lineHeight: 22 },
  aktionen: { gap: Spacing.two },
});
