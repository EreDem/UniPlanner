// Checkbox links in einer Event-Zeile: Kreis in der Modulfarbe, abgehakt gefüllt mit Haken.
// Abgehakt ist ein Event, wenn es erledigt ist (siehe `istErledigt` und `statusNachAbhaken`).

import { Check } from '@/components/icons';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

export function AbhakKreis({
  farbe,
  abgehakt,
  onPress,
  beschriftung,
  groesse = 22,
}: {
  farbe: string;
  abgehakt: boolean;
  onPress: () => void;
  /** Wofür die Checkbox steht, z. B. der Titel des Events. */
  beschriftung: string;
  groesse?: number;
}) {
  // Der Haken springt nur beim Abhaken auf, nicht bei Zeilen, die schon abgehakt erscheinen.
  const [anfangsAbgehakt] = useState(abgehakt);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: abgehakt }}
      accessibilityLabel={beschriftung}
      accessibilityHint={abgehakt ? 'Hebt das Abhaken auf' : 'Hakt ab'}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [
        styles.kreis,
        { width: groesse, height: groesse, borderRadius: groesse / 2, borderColor: farbe },
        abgehakt && { backgroundColor: farbe },
        { opacity: pressed ? 0.6 : 1 },
      ]}>
      {abgehakt && (
        <Animated.View entering={anfangsAbgehakt ? undefined : ZoomIn.duration(160)}>
          <Check size={groesse * 0.6} color="#FFFFFF" strokeWidth={3.2} />
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kreis: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
