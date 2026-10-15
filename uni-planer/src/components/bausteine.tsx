// Kleine, wiederverwendbare UI-Bausteine des Designsystems „Tinte & Signal“.

import { Check, CircleAlert, type LucideIcon } from '@/components/icons';
import { useEffect, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Radius, Schrift, Spacing, Typo } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type KnopfArt = 'primaer' | 'sekundaer' | 'gefahr' | 'gefahrUmriss';

export function Knopf({
  titel,
  onPress,
  art = 'primaer',
  icon: Icon,
  laedt = false,
  deaktiviert = false,
  gross = false,
  style,
}: {
  titel: string;
  onPress: () => void;
  art?: KnopfArt;
  icon?: LucideIcon;
  laedt?: boolean;
  deaktiviert?: boolean;
  /** Großer Hauptknopf eines Screens, z. B. „Verbinden“ oder „Speichern“. */
  gross?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const gesperrt = deaktiviert || laedt;

  let hintergrund: string = 'transparent';
  let textFarbe: string = theme.text;
  if (art === 'primaer') {
    hintergrund = deaktiviert ? theme.deaktiviert : theme.primaer;
    textFarbe = deaktiviert ? theme.deaktiviertText : theme.primaerText;
  } else if (art === 'sekundaer') {
    hintergrund = theme.flaeche2;
  } else {
    textFarbe = theme.gefahr;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: gesperrt, busy: laedt }}
      disabled={gesperrt}
      onPress={onPress}
      style={({ pressed }) => [
        styles.knopf,
        gross && styles.knopfGross,
        { backgroundColor: hintergrund, opacity: pressed ? 0.8 : 1 },
        art === 'gefahrUmriss' && { borderWidth: 1, borderColor: theme.gefahrRand },
        style,
      ]}>
      {laedt ? (
        <ActivityIndicator color={textFarbe} />
      ) : (
        <>
          {Icon && <Icon size={18} color={textFarbe} strokeWidth={2.2} />}
          <Text style={[styles.knopfText, gross && styles.knopfTextGross, { color: textFarbe }]}>{titel}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Abgesetzte Fläche mit runden Ecken, z. B. für Einstellungsgruppen. */
export function Karte({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.karte, { backgroundColor: theme.flaeche }, style]}>{children}</View>;
}

/** Kleine Überschrift in Großbuchstaben, z. B. „MOODLE-VERBINDUNG“. */
export function Abschnittstitel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const theme = useTheme();
  return <Text style={[Typo.label, { color: theme.text2 }, style]}>{children}</Text>;
}

export function Fliesstext({
  children,
  sekundaer = false,
  style,
}: {
  children: ReactNode;
  sekundaer?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return <Text style={[Typo.fliesstext, { color: sekundaer ? theme.text2 : theme.text }, style]}>{children}</Text>;
}

/** Hinweisbox mit Symbol, z. B. für Fehler oder entfernte Events. */
export function Hinweis({
  children,
  art = 'warnung',
  style,
}: {
  children: ReactNode;
  art?: 'warnung' | 'fehler';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const farbe = art === 'fehler' ? theme.gefahr : theme.warnungText;
  return (
    <View
      accessibilityRole={art === 'fehler' ? 'alert' : undefined}
      style={[
        styles.hinweis,
        { backgroundColor: art === 'fehler' ? theme.fehlerHintergrund : theme.warnungHintergrund },
        style,
      ]}>
      <CircleAlert size={17} color={farbe} strokeWidth={2} style={styles.hinweisSymbol} />
      <Text style={[styles.hinweisText, { color: farbe }]}>{children}</Text>
    </View>
  );
}

/** Auswählbarer Chip, z. B. für den Event-Typ oder ein Modul. Optional mit Farbpunkt oder Haken. */
export function Chip({
  titel,
  aktiv,
  onPress,
  farbe,
  haken = false,
}: {
  titel: string;
  aktiv: boolean;
  onPress: () => void;
  /** Farbpunkt vor dem Titel, z. B. die Modulfarbe. */
  farbe?: string;
  /** Haken vor dem Titel, wenn aktiv. */
  haken?: boolean;
}) {
  const theme = useTheme();
  const textFarbe = aktiv ? theme.primaerText : theme.text;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: aktiv }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        aktiv
          ? { backgroundColor: theme.primaer, borderColor: theme.primaer }
          : { backgroundColor: theme.blattFeld, borderColor: theme.chipRand },
        { opacity: pressed ? 0.8 : 1 },
      ]}>
      {haken && aktiv && <Check size={16} color={textFarbe} strokeWidth={2.6} />}
      {farbe && <View style={[styles.chipPunkt, { backgroundColor: farbe }]} />}
      <Text numberOfLines={1} style={[styles.chipText, { color: textFarbe }]}>
        {titel}
      </Text>
    </Pressable>
  );
}

/** Ein-/Aus-Schalter im Stil des Designsystems (Tinte = an). */
export function Schalter({
  wert,
  onAendern,
  deaktiviert = false,
  beschriftung,
}: {
  wert: boolean;
  onAendern: (wert: boolean) => void;
  deaktiviert?: boolean;
  beschriftung: string;
}) {
  const theme = useTheme();
  const position = useSharedValue(wert ? 1 : 0);

  useEffect(() => {
    position.value = withTiming(wert ? 1 : 0, { duration: 160 });
  }, [wert, position]);

  const knopfStil = useAnimatedStyle(() => ({ transform: [{ translateX: position.value * 20 }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={beschriftung}
      accessibilityState={{ checked: wert, disabled: deaktiviert }}
      disabled={deaktiviert}
      hitSlop={6}
      onPress={() => onAendern(!wert)}
      style={[
        styles.schalter,
        { backgroundColor: wert ? theme.primaer : theme.schalterAus, opacity: deaktiviert ? 0.4 : 1 },
      ]}>
      <Animated.View
        style={[styles.schalterKnopf, { backgroundColor: wert ? theme.primaerText : '#FFFFFF' }, knopfStil]}
      />
    </Pressable>
  );
}

/** Segment-Auswahl für zwei bis drei Optionen, z. B. „Nachzuarbeiten | Erledigt“. */
export function Segment<T extends string>({
  optionen,
  wert,
  onAendern,
}: {
  optionen: readonly { wert: T; titel: string }[];
  wert: T;
  onAendern: (wert: T) => void;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[styles.segment, { backgroundColor: theme.flaeche2 }]}>
      {optionen.map((option) => {
        const aktiv = option.wert === wert;
        return (
          <Pressable
            key={option.wert}
            accessibilityRole="radio"
            accessibilityState={{ selected: aktiv }}
            onPress={() => onAendern(option.wert)}
            style={[styles.segmentTeil, aktiv && [styles.segmentAktiv, { backgroundColor: theme.flaeche }]]}>
            <Text style={[styles.segmentText, { color: aktiv ? theme.text : theme.text2 }]}>{option.titel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Stil für Eingabefelder: abgesetzte Fläche mit feinem Rand. */
export function useFeldStil(fehler = false): TextStyle {
  const theme = useTheme();
  return {
    ...styles.feld,
    color: theme.text,
    backgroundColor: theme.grund,
    borderColor: fehler ? theme.gefahr : theme.feldRand,
    borderWidth: fehler ? 2 : 1,
  };
}

const styles = StyleSheet.create({
  knopf: {
    minHeight: 48,
    borderRadius: Radius.feld,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  knopfGross: { minHeight: 54, borderRadius: Radius.knopf },
  knopfText: { fontFamily: Schrift.fett, fontSize: 15 },
  knopfTextGross: { fontSize: 16 },
  karte: { borderRadius: Radius.karte, padding: Spacing.three, gap: Spacing.three },
  hinweis: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
    borderRadius: Radius.knopf,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.three - 2,
  },
  hinweisSymbol: { marginTop: 1 },
  hinweisText: { flex: 1, fontFamily: Schrift.mittel, fontSize: 13, lineHeight: 19 },
  chip: {
    minHeight: 40,
    borderRadius: Radius.chip,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: '100%',
  },
  chipPunkt: { width: 9, height: 9, borderRadius: 4.5 },
  chipText: { flexShrink: 1, fontFamily: Schrift.halbfett, fontSize: 15 },
  schalter: { width: 52, height: 32, borderRadius: 16, padding: 4, justifyContent: 'center' },
  schalterKnopf: { width: 24, height: 24, borderRadius: 12 },
  segment: { flexDirection: 'row', borderRadius: Radius.knopf, padding: 4 },
  segmentTeil: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  segmentAktiv: {
    shadowColor: '#101828',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontFamily: Schrift.fett, fontSize: 15 },
  feld: {
    minHeight: 46,
    borderRadius: Radius.feld,
    paddingHorizontal: Spacing.three - 2,
    fontFamily: Schrift.halbfett,
    fontSize: 15,
  },
});
