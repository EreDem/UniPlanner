// Bottom-Sheet zur Statusauswahl, wird über das Status-Badge geöffnet.

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OptionZeile } from '@/components/bausteine';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { STATUS_TEXT, STATUS_WERTE, type EventTyp, type Status } from '@/model/types';

export function StatusAuswahl({
  auswahl,
  onWaehle,
  onSchliessen,
}: {
  /** `null` = geschlossen. */
  auswahl: { titel: string; typ: EventTyp; status: Status } | null;
  onWaehle: (status: Status) => void;
  onSchliessen: () => void;
}) {
  const theme = useTheme();
  const abstandUnten = useSafeAreaInsets().bottom;

  return (
    <Modal visible={auswahl !== null} transparent animationType="slide" onRequestClose={onSchliessen}>
      <Pressable accessibilityLabel="Schließen" style={styles.hintergrund} onPress={onSchliessen} />
      {auswahl && (
        <View
          style={[
            styles.blatt,
            { backgroundColor: theme.background, paddingBottom: abstandUnten + Spacing.three },
          ]}>
          <Text numberOfLines={2} style={[styles.titel, { color: theme.text }]}>
            {auswahl.titel}
          </Text>
          {STATUS_WERTE[auswahl.typ].map((status) => (
            <OptionZeile
              key={status}
              titel={STATUS_TEXT[status]}
              ausgewaehlt={status === auswahl.status}
              onPress={() => onWaehle(status)}
            />
          ))}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  hintergrund: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  blatt: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.one,
  },
  titel: { fontSize: 17, fontWeight: '600', marginBottom: Spacing.two },
});
