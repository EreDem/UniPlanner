import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BereichsListe, ListenKopf, ListenLeer } from '@/components/bereichs-liste';
import { RueckgaengigLeiste } from '@/components/rueckgaengig-leiste';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useListenDaten } from '@/hooks/use-listen-daten';
import { useTheme } from '@/hooks/use-theme';
import { baueErledigtListe } from '@/model/types';

const ABSTAND_UNTEN = BottomTabInset + Spacing.three;

export default function ErledigtListe() {
  const theme = useTheme();
  const { daten, eingabe, jetzt } = useListenDaten();

  return (
    <SafeAreaView edges={['top']} style={[styles.flaeche, { backgroundColor: theme.background }]}>
      {daten && eingabe && (
        <BereichsListe
          bereiche={baueErledigtListe(eingabe)}
          gespeicherterStatus={daten.status}
          jetztMs={jetzt}
          abstandUnten={ABSTAND_UNTEN + 64}
          kopf={
            <ListenKopf titel="Erledigt">
              <Text style={[styles.hinweis, { color: theme.textSecondary }]}>
                Status antippen, um etwas wieder in die To-do-Liste zu holen.
              </Text>
            </ListenKopf>
          }
          leer={
            <ListenLeer
              titel="Noch nichts erledigt"
              text="Abgegebene Abgaben und erledigte Vorlesungen erscheinen hier."
            />
          }
        />
      )}
      <RueckgaengigLeiste abstandUnten={ABSTAND_UNTEN} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flaeche: { flex: 1 },
  hinweis: { fontSize: 13 },
});
