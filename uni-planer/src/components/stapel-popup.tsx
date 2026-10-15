// Schwebendes Popup in der Mitte mit den einzelnen Vorlesungen eines Stapels.

import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RueckgaengigLeiste } from '@/components/rueckgaengig-leiste';
import { ToDoZeile } from '@/components/todo-zeile';
import { modulFarbe } from '@/constants/farben';
import { Radius, Schrift, Spacing } from '@/constants/theme';
import { useSchema, useTheme } from '@/hooks/use-theme';
import type { BereichSchluessel, ToDoEintrag } from '@/model/types';

export function StapelPopup({
  eintraege,
  bereich,
  jetztMs,
  onZeile,
  onStatus,
  onAbhaken,
  onSchliessen,
  children,
}: {
  /** Leer = geschlossen. */
  eintraege: ToDoEintrag[];
  /** Bereich, aus dem der Stapel stammt (Überschrift). */
  bereich: BereichSchluessel;
  jetztMs: number;
  onZeile: (eintrag: ToDoEintrag) => void;
  onStatus: (eintrag: ToDoEintrag) => void;
  onAbhaken: (eintrag: ToDoEintrag) => void;
  onSchliessen: () => void;
  /** Wird im Popup gerendert, z. B. die Statusauswahl, damit sie darüber erscheint. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  const schema = useSchema();
  const abstandUnten = useSafeAreaInsets().bottom;
  const erster = eintraege[0];

  return (
    <Modal visible={eintraege.length > 0} transparent animationType="fade" onRequestClose={onSchliessen}>
      <View style={[styles.flaeche, { backgroundColor: theme.schleier }]}>
        <Pressable accessibilityLabel="Schließen" style={StyleSheet.absoluteFill} onPress={onSchliessen} />
        {erster && (
          <Animated.View entering={ZoomIn.duration(180)} style={[styles.karte, { backgroundColor: theme.grund }]}>
            <View style={styles.kopf}>
              <View style={[styles.punkt, { backgroundColor: modulFarbe(erster.event.modulId, schema) }]} />
              <View style={styles.kopfText}>
                <Text numberOfLines={1} style={[styles.titel, { color: theme.text }]}>
                  {erster.modul?.name ?? 'Ohne Modul'}
                </Text>
                <Text style={[styles.untertitel, { color: theme.text2 }]}>
                  {eintraege.length === 1 ? '1 Vorlesung' : `${eintraege.length} Vorlesungen`}{' '}
                  {bereich === 'erledigte-vorlesungen' ? 'erledigt' : 'nachzuarbeiten'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={onSchliessen}
                style={({ pressed }) => [styles.fertig, { backgroundColor: theme.flaeche2, opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.fertigText, { color: theme.text }]}>Fertig</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.liste}>
              {eintraege.map((eintrag) => (
                <ToDoZeile
                  key={eintrag.event.id}
                  eintrag={eintrag}
                  bereich={bereich}
                  jetztMs={jetztMs}
                  kompakt
                  onPress={() => onZeile(eintrag)}
                  onStatusPress={() => onStatus(eintrag)}
                  onAbhaken={() => onAbhaken(eintrag)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </View>
      <RueckgaengigLeiste abstandUnten={abstandUnten + Spacing.three} />
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.three },
  karte: {
    maxHeight: '75%',
    borderRadius: Radius.popup,
    padding: 12,
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  kopf: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6, paddingBottom: 12 },
  punkt: { width: 10, height: 10, borderRadius: 5 },
  kopfText: { flex: 1 },
  titel: { fontFamily: Schrift.fett, fontSize: 17, lineHeight: 22 },
  untertitel: { fontFamily: Schrift.mittel, fontSize: 13 },
  fertig: { minHeight: 36, borderRadius: Radius.feld, paddingHorizontal: 14, justifyContent: 'center' },
  fertigText: { fontFamily: Schrift.fett, fontSize: 14 },
  liste: { gap: Spacing.two },
});
