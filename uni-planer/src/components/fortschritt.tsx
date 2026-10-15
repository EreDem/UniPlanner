// Fortschritt der Punkte: Ring (Modulliste) und Balken mit optionaler Grenze (Modulseite).

import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/** Ring für einen Anteil von 0 bis 100. */
export function FortschrittsRing({ prozent, groesse = 26, staerke = 4 }: { prozent: number; groesse?: number; staerke?: number }) {
  const theme = useTheme();
  const radius = (groesse - staerke) / 2;
  const umfang = 2 * Math.PI * radius;
  const anteil = Math.max(0, Math.min(100, prozent)) / 100;
  const mitte = groesse / 2;

  return (
    <Svg width={groesse} height={groesse} accessibilityElementsHidden importantForAccessibility="no">
      <Circle cx={mitte} cy={mitte} r={radius} stroke={theme.ringSpur} strokeWidth={staerke} fill="none" />
      {anteil > 0 && (
        <Circle
          cx={mitte}
          cy={mitte}
          r={radius}
          stroke={theme.text}
          strokeWidth={staerke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${umfang * anteil} ${umfang}`}
          rotation={-90}
          origin={`${mitte}, ${mitte}`}
        />
      )}
    </Svg>
  );
}

/**
 * Balken für einen Anteil von 0 bis 100. Mit Grenze (z. B. 50 % für die Klausurzulassung) gibt es
 * eine Markierung; der Balken ist grün, sobald die Grenze erreicht ist, sonst gelb.
 */
export function FortschrittsBalken({ prozent, grenze }: { prozent: number; grenze: number | null }) {
  const theme = useTheme();
  const anteil = Math.max(0, Math.min(100, prozent));
  const farbe = grenze === null || anteil >= grenze ? theme.fortschritt : theme.fortschrittKnapp;

  return (
    <View style={styles.balken} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.spur, { backgroundColor: theme.flaeche2 }]}>
        <View style={[styles.fuellung, { width: `${anteil}%`, backgroundColor: farbe }]} />
      </View>
      {grenze !== null && <View style={[styles.grenze, { left: `${grenze}%`, backgroundColor: theme.text }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  balken: { height: 18, justifyContent: 'center' },
  spur: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fuellung: { height: '100%', borderRadius: 5 },
  grenze: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, borderRadius: 1 },
});
