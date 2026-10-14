// Kleine, wiederverwendbare UI-Bausteine.

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type KnopfArt = 'primaer' | 'sekundaer' | 'gefahr';

export function Knopf({
  titel,
  onPress,
  art = 'primaer',
  laedt = false,
  deaktiviert = false,
  style,
}: {
  titel: string;
  onPress: () => void;
  art?: KnopfArt;
  laedt?: boolean;
  deaktiviert?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const hintergrund = art === 'primaer' ? theme.akzent : theme.backgroundElement;
  const textFarbe = art === 'primaer' ? theme.akzentText : art === 'gefahr' ? theme.gefahr : theme.text;
  const gesperrt = deaktiviert || laedt;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: gesperrt, busy: laedt }}
      disabled={gesperrt}
      onPress={onPress}
      style={({ pressed }) => [
        styles.knopf,
        { backgroundColor: hintergrund, opacity: gesperrt ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {laedt ? (
        <ActivityIndicator color={textFarbe} />
      ) : (
        <Text style={[styles.knopfText, { color: textFarbe }]}>{titel}</Text>
      )}
    </Pressable>
  );
}

export function Karte({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.karte, { backgroundColor: theme.backgroundElement }, style]}>{children}</View>;
}

export function Abschnittstitel({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.abschnittstitel, { color: theme.textSecondary }]}>{children}</Text>;
}

export function Fliesstext({ children, sekundaer = false }: { children: ReactNode; sekundaer?: boolean }) {
  const theme = useTheme();
  return <Text style={[styles.fliesstext, { color: sekundaer ? theme.textSecondary : theme.text }]}>{children}</Text>;
}

/** Hinweisbox, z. B. für Fehler oder entfernte Events. */
export function Hinweis({ children, art = 'warnung' }: { children: ReactNode; art?: 'warnung' | 'fehler' }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.hinweis,
        { backgroundColor: art === 'fehler' ? theme.fehlerHintergrund : theme.warnungHintergrund },
      ]}>
      <Text style={[styles.fliesstext, { color: art === 'fehler' ? theme.gefahr : theme.warnungText }]}>
        {children}
      </Text>
    </View>
  );
}

/** Auswahlzeile mit Haken, für Einfachauswahlen. */
export function OptionZeile({
  titel,
  ausgewaehlt,
  onPress,
}: {
  titel: string;
  ausgewaehlt: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: ausgewaehlt }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <Text style={[styles.fliesstext, { color: theme.text, flex: 1 }]}>{titel}</Text>
      <Text style={[styles.haken, { color: theme.akzent }]}>{ausgewaehlt ? '✓' : ''}</Text>
    </Pressable>
  );
}

/** Kleiner auswählbarer Chip, z. B. für Module oder den Event-Typ. */
export function Chip({ titel, aktiv, onPress }: { titel: string; aktiv: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: aktiv }}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: aktiv ? theme.akzent : theme.backgroundElement, borderColor: aktiv ? theme.akzent : theme.rand },
      ]}>
      <Text style={[styles.chipText, { color: aktiv ? theme.akzentText : theme.text }]}>{titel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  knopf: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knopfText: { fontSize: 16, fontWeight: '600' },
  karte: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  abschnittstitel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  fliesstext: { fontSize: 15, lineHeight: 21 },
  hinweis: { borderRadius: 12, padding: Spacing.three },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
  },
  haken: { fontSize: 18, fontWeight: '700', width: 24, textAlign: 'right' },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
});
