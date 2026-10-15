// Blatt von unten zur Statusauswahl, wird über das Status-Badge geöffnet.

import { Check } from '@/components/icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { modulFarbe, statusFarben } from '@/constants/farben';
import { Radius, Schrift, Spacing, Typo } from '@/constants/theme';
import { useSchema, useTheme } from '@/hooks/use-theme';
import {
  anzeigeTitel,
  STATUS_TEXT,
  STATUS_WERTE,
  statusErklaerung,
  type EventTyp,
  type Status,
  type ToDoEintrag,
} from '@/model/types';
import { formatiere, terminText } from '@/zeit';

export function StatusAuswahl({
  eintrag,
  onWaehle,
  onSchliessen,
}: {
  /** `null` = geschlossen. */
  eintrag: ToDoEintrag | null;
  onWaehle: (status: Status) => void;
  onSchliessen: () => void;
}) {
  const theme = useTheme();
  const schema = useSchema();
  const abstandUnten = useSafeAreaInsets().bottom;

  return (
    <Modal visible={eintrag !== null} transparent animationType="fade" onRequestClose={onSchliessen}>
      <Pressable
        accessibilityLabel="Schließen"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.schleier }]}
        onPress={onSchliessen}
      />
      {eintrag && (
        <Animated.View
          entering={SlideInDown.duration(220)}
          style={[styles.blatt, { backgroundColor: theme.flaeche, paddingBottom: abstandUnten + Spacing.three }]}>
          <View style={[styles.griff, { backgroundColor: theme.griff }]} />
          <View style={styles.kopf}>
            <View style={styles.modulZeile}>
              <View style={[styles.modulPunkt, { backgroundColor: modulFarbe(eintrag.event.modulId, schema) }]} />
              <Text numberOfLines={1} style={[styles.modul, { color: theme.text2 }]}>
                {[eintrag.modul?.name ?? 'Ohne Modul', zeitText(eintrag)].join(' · ')}
              </Text>
            </View>
            <Text numberOfLines={2} style={[Typo.abschnitt, { color: theme.text }]}>
              {anzeigeTitel(eintrag.event)}
            </Text>
          </View>
          <StatusOptionen
            typ={eintrag.event.typ}
            status={eintrag.status}
            onWaehle={onWaehle}
            hervorhebung={theme.grund}
            erklaerungen="alle"
          />
        </Animated.View>
      )}
    </Modal>
  );
}

function zeitText({ event }: ToDoEintrag): string {
  return event.typ === 'abgabe'
    ? formatiere(event.startMs, 'EEEEEE dd.MM., HH:mm')
    : terminText(event.startMs, event.endeMs);
}

/**
 * Status als Liste mit Farbpunkt und Haken beim aktuellen, für Blatt und Detailansicht.
 * `erklaerungen`: im Blatt bei allen, in der Detailansicht nur bei den missverständlichen
 * („Erledigt“ einer Abgabe und „Verpasst“).
 */
export function StatusOptionen({
  typ,
  status,
  onWaehle,
  hervorhebung,
  erklaerungen,
}: {
  typ: EventTyp;
  status: Status;
  onWaehle: (status: Status) => void;
  /** Hintergrund der gewählten Zeile. */
  hervorhebung: string;
  erklaerungen: 'alle' | 'noetige';
}) {
  const theme = useTheme();
  const schema = useSchema();

  return (
    <View accessibilityRole="radiogroup">
      {STATUS_WERTE[typ].map((wert) => {
        const gewaehlt = wert === status;
        const mitErklaerung =
          erklaerungen === 'alle' || (typ === 'abgabe' && (wert === 'erledigt' || wert === 'verpasst'));
        return (
          <Pressable
            key={wert}
            accessibilityRole="radio"
            accessibilityState={{ selected: gewaehlt }}
            onPress={() => onWaehle(wert)}
            style={({ pressed }) => [
              styles.option,
              erklaerungen === 'alle' ? styles.optionGross : styles.optionKlein,
              (gewaehlt || pressed) && { backgroundColor: hervorhebung },
            ]}>
            <View style={[styles.statusPunkt, { backgroundColor: statusFarben(schema, typ, wert).punkt }]} />
            <View style={styles.optionText}>
              <Text
                style={[
                  styles.optionTitel,
                  { color: theme.text, fontFamily: gewaehlt || erklaerungen === 'alle' ? Schrift.fett : Schrift.mittel },
                ]}>
                {STATUS_TEXT[wert]}
              </Text>
              {mitErklaerung && (
                <Text style={[erklaerungen === 'alle' ? Typo.details : styles.erklaerungKlein, { color: theme.text2 }]}>
                  {statusErklaerung(typ, wert)}
                </Text>
              )}
            </View>
            {gewaehlt && <Check size={20} color={theme.text} strokeWidth={2.4} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blatt: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.blatt,
    borderTopRightRadius: Radius.blatt,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
  },
  griff: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: Spacing.three },
  kopf: { paddingHorizontal: Spacing.two, gap: 2, marginBottom: Spacing.three },
  modulZeile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  modulPunkt: { width: 9, height: 9, borderRadius: 4.5 },
  modul: { flex: 1, fontFamily: Schrift.halbfett, fontSize: 13 },
  option: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three - 2, borderRadius: Radius.feld },
  optionGross: { minHeight: 56, paddingHorizontal: Spacing.two },
  optionKlein: { minHeight: 48, paddingHorizontal: 10 },
  statusPunkt: { width: 12, height: 12, borderRadius: 6 },
  optionText: { flex: 1, paddingVertical: 6 },
  optionTitel: { fontSize: 16, lineHeight: 21 },
  erklaerungKlein: { fontFamily: Schrift.mittel, fontSize: 12, lineHeight: 16 },
});
