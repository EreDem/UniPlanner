// Schwebendes Popup in der Mitte mit den einzelnen Vorlesungen eines Stapels,
// im selben Zeilen-Design wie im Bereich, aus dem der Stapel stammt.

import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RueckgaengigLeiste } from '@/components/rueckgaengig-leiste';
import { ToDoZeile } from '@/components/todo-zeile';
import { modulFarbe } from '@/constants/farben';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BereichSchluessel, ToDoEintrag } from '@/model/types';

export function StapelPopup({
  eintraege,
  bereich,
  jetztMs,
  onZeile,
  onStatus,
  onSchliessen,
  children,
}: {
  /** Leer = geschlossen. */
  eintraege: ToDoEintrag[];
  /** Bereich, aus dem der Stapel stammt (Zeilen-Design und Überschrift). */
  bereich: BereichSchluessel;
  jetztMs: number;
  onZeile: (eintrag: ToDoEintrag) => void;
  onStatus: (eintrag: ToDoEintrag) => void;
  onSchliessen: () => void;
  /** Wird im Popup gerendert, z. B. die Statusauswahl, damit sie darüber erscheint. */
  children?: ReactNode;
}) {
  const theme = useTheme();
  const abstandUnten = useSafeAreaInsets().bottom;
  const erster = eintraege[0];

  return (
    <Modal visible={eintraege.length > 0} transparent animationType="fade" onRequestClose={onSchliessen}>
      <View style={styles.flaeche}>
        <Pressable accessibilityLabel="Schließen" style={StyleSheet.absoluteFill} onPress={onSchliessen} />
        {erster && (
          <View style={[styles.karte, { backgroundColor: theme.background, borderColor: theme.rand }]}>
            <View style={styles.kopf}>
              <View style={[styles.punkt, { backgroundColor: modulFarbe(erster.event.modulId) }]} />
              <View style={styles.kopfText}>
                <Text numberOfLines={1} style={[styles.titel, { color: theme.text }]}>
                  {erster.modul?.name ?? 'Ohne Modul'}
                </Text>
                <Text style={[styles.untertitel, { color: theme.textSecondary }]}>
                  {eintraege.length === 1 ? '1 Vorlesung' : `${eintraege.length} Vorlesungen`}{' '}
                  {bereich === 'erledigte-vorlesungen' ? 'erledigt' : 'nachzuarbeiten'}
                </Text>
              </View>
              <Pressable accessibilityRole="button" hitSlop={12} onPress={onSchliessen}>
                <Text style={[styles.schliessen, { color: theme.akzent }]}>Fertig</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.liste}>
              {eintraege.map((eintrag) => (
                <ToDoZeile
                  key={eintrag.event.id}
                  eintrag={eintrag}
                  bereich={bereich}
                  jetztMs={jetztMs}
                  onPress={() => onZeile(eintrag)}
                  onStatusPress={() => onStatus(eintrag)}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
      <RueckgaengigLeiste abstandUnten={abstandUnten + Spacing.three} />
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  flaeche: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  karte: {
    maxHeight: '75%',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.three,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  kopf: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  punkt: { width: 10, height: 10, borderRadius: 5 },
  kopfText: { flex: 1 },
  titel: { fontSize: 17, fontWeight: '600' },
  untertitel: { fontSize: 13 },
  schliessen: { fontSize: 15, fontWeight: '600' },
  liste: { paddingBottom: Spacing.two },
});
