import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Schrift } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.flaeche}
      indicatorColor={theme.tabIndikator}
      rippleColor={theme.flaeche2}
      iconColor={{ default: theme.text2, selected: theme.text }}
      labelStyle={{
        default: { color: theme.text2, fontFamily: Schrift.fett, fontSize: 12 },
        selected: { color: theme.text, fontFamily: Schrift.fett, fontSize: 12 },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>To-do</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="erledigt">
        <NativeTabs.Trigger.Label>Erledigt</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checkmark.circle" md="check_circle" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="module">
        <NativeTabs.Trigger.Label>Module</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="books.vertical" md="library_books" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="einstellungen">
        <NativeTabs.Trigger.Label>Einstellungen</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" md="tune" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
