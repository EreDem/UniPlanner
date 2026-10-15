import { Pressable, StyleSheet, Text } from 'react-native';

import { statusFarben } from '@/constants/farben';
import { Schrift } from '@/constants/theme';
import { useSchema } from '@/hooks/use-theme';
import { STATUS_TEXT, type EventTyp, type Status } from '@/model/types';

/** Status als Pille; antippen öffnet die volle Statusauswahl. */
export function StatusBadge({
  typ,
  status,
  ueberfaellig = false,
  onPress,
}: {
  typ: EventTyp;
  status: Status;
  ueberfaellig?: boolean;
  onPress?: () => void;
}) {
  const farben = statusFarben(useSchema(), typ, status, ueberfaellig);
  const text = ueberfaellig && status === 'ausstehend' ? 'Überfällig' : STATUS_TEXT[status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Status: ${text}. Ändern`}
      disabled={!onPress}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.badge, { backgroundColor: farben.hintergrund, opacity: pressed ? 0.7 : 1 }]}>
      <Text style={[styles.text, { color: farben.text }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { height: 26, borderRadius: 13, paddingHorizontal: 12, justifyContent: 'center' },
  text: { fontFamily: Schrift.fett, fontSize: 12 },
});
