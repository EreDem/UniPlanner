import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Radius, Schrift, Spacing } from '@/constants/theme';
import { schliesseRueckgaengig, useRueckgaengig } from '@/daten/rueckgaengig';
import { useTheme } from '@/hooks/use-theme';

/** Höhe der Leiste, damit z. B. der „+“-Knopf darüber ausweichen kann. */
export const LEISTE_HOEHE = 52;

export function RueckgaengigLeiste({ abstandUnten }: { abstandUnten: number }) {
  const meldung = useRueckgaengig();
  const theme = useTheme();
  if (!meldung) return null;

  return (
    <Animated.View
      key={meldung.id}
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      accessibilityLiveRegion="polite"
      style={[styles.leiste, { bottom: abstandUnten, backgroundColor: theme.leisteHintergrund }]}>
      <Text numberOfLines={1} style={[styles.text, { color: theme.leisteText }]}>
        {meldung.text}
      </Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={12}
        onPress={() => {
          schliesseRueckgaengig();
          meldung.rueckgaengig();
        }}>
        <Text style={[styles.aktion, { color: theme.leisteAktion }]}>Rückgängig</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  leiste: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    minHeight: LEISTE_HOEHE,
    borderRadius: Radius.knopf,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { flex: 1, fontFamily: Schrift.halbfett, fontSize: 14 },
  aktion: { fontFamily: Schrift.fett, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
});
