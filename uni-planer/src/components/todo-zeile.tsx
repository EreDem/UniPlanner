import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/status-badge';
import { modulFarbe, statusFarben } from '@/constants/farben';
import { Spacing } from '@/constants/theme';
import { useSchema, useTheme } from '@/hooks/use-theme';
import { anzeigeTitel, istVorlesung, type BereichSchluessel, type Stapel, type ToDoEintrag } from '@/model/types';
import { formatiere, fristText, terminText } from '@/zeit';

export function ToDoZeile({
  eintrag,
  bereich,
  jetztMs,
  onPress,
  onStatusPress,
  anzahl,
  zusatz,
  aktion,
}: {
  eintrag: ToDoEintrag;
  bereich: BereichSchluessel;
  jetztMs: number;
  onPress: () => void;
  onStatusPress?: () => void;
  /** Für Stapel: rechts die Anzahl statt des Status-Badges. */
  anzahl?: number;
  /** Zusätzliche Zeile unter den Details, z. B. die Punkte einer Abgabe. */
  zusatz?: string;
  /** Rechts ein Knopf statt des Status-Badges, z. B. „Einblenden“. */
  aktion?: { titel: string; onPress: () => void };
}) {
  const theme = useTheme();
  const schema = useSchema();
  const { event, modul, status, ueberfaellig } = eintrag;

  let zeit: string;
  if (event.typ === 'abgabe') zeit = fristText(event.startMs, jetztMs);
  else if (bereich === 'heute') zeit = `${formatiere(event.startMs, 'HH:mm')}–${formatiere(event.endeMs, 'HH:mm')}`;
  else zeit = terminText(event.startMs, event.endeMs);
  const details = [zeit, ...event.raeume].join(' · ');

  let rechts = null;
  if (aktion) {
    rechts = (
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={aktion.onPress}
        style={({ pressed }) => [styles.aktion, { backgroundColor: theme.akzent, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={[styles.aktionText, { color: theme.akzentText }]}>{aktion.titel}</Text>
      </Pressable>
    );
  } else if (event.typ === 'vorlesung' && !istVorlesung(event)) {
    // Übungen, Tutorien usw. haben keinen Status, sie stehen nur unter „Heute“.
  } else if (anzahl === undefined) {
    rechts = <StatusBadge typ={event.typ} status={status} ueberfaellig={ueberfaellig} onPress={onStatusPress} />;
  } else {
    const farben = statusFarben(schema, event.typ, status);
    rechts = (
      <View style={[styles.anzahl, { backgroundColor: farben.hintergrund }]}>
        <Text style={[styles.anzahlText, { color: farben.text }]}>{anzahl}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={anzahl === undefined ? undefined : `${anzahl} Vorlesungen, öffnet die Liste`}
      onPress={onPress}
      style={({ pressed }) => [styles.zeile, { backgroundColor: pressed ? theme.backgroundSelected : theme.background }]}>
      <View style={[styles.streifen, { backgroundColor: modulFarbe(event.modulId) }]} />
      <View style={styles.inhalt}>
        <View style={styles.kopf}>
          <Text numberOfLines={1} style={[styles.modul, { color: theme.textSecondary }]}>
            {modul?.name ?? 'Ohne Modul'}
          </Text>
          {rechts}
        </View>
        <Text numberOfLines={2} style={[styles.titel, { color: theme.text }]}>
          {anzeigeTitel(event)}
        </Text>
        <Text style={[styles.details, { color: ueberfaellig ? theme.gefahr : theme.textSecondary }]}>
          {details}
        </Text>
        {zusatz && <Text style={[styles.details, { color: theme.text }]}>{zusatz}</Text>}
        {event.entferntMs !== null && (
          <Text style={[styles.details, { color: theme.warnungText }]}>Aus Moodle entfernt</Text>
        )}
      </View>
    </Pressable>
  );
}

/** Mehrere Vorlesungen eines Moduls: zeigt die erste des Stapels, rechts die Anzahl statt des Status. */
export function StapelZeile({
  stapel,
  bereich,
  jetztMs,
  onPress,
}: {
  stapel: Stapel;
  bereich: BereichSchluessel;
  jetztMs: number;
  onPress: () => void;
}) {
  return (
    <ToDoZeile
      eintrag={stapel.eintraege[0]}
      bereich={bereich}
      jetztMs={jetztMs}
      anzahl={stapel.eintraege.length}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  zeile: { flexDirection: 'row', paddingVertical: Spacing.two, paddingRight: Spacing.three },
  streifen: { width: 4, borderRadius: 2, marginLeft: Spacing.three, marginRight: Spacing.three },
  inhalt: { flex: 1, gap: 2 },
  kopf: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  modul: { flex: 1, fontSize: 13, fontWeight: '500' },
  titel: { fontSize: 16, fontWeight: '600', lineHeight: 21 },
  details: { fontSize: 13, lineHeight: 18 },
  anzahl: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, minWidth: 32, alignItems: 'center' },
  anzahlText: { fontSize: 13, fontWeight: '700' },
  aktion: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  aktionText: { fontSize: 13, fontWeight: '600' },
});
