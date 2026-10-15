/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useErscheinungsbild } from '@/daten/erscheinungsbild';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Schema = 'light' | 'dark';

/** Hell oder dunkel: die Wahl in den Einstellungen, bei „System“ das Schema des Geräts. */
export function useSchema(): Schema {
  const erscheinungsbild = useErscheinungsbild();
  const system = useColorScheme();
  if (erscheinungsbild === 'hell') return 'light';
  if (erscheinungsbild === 'dunkel') return 'dark';
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useSchema()];
}
