import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import * as Font from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  ErrorBoundary as StandardFehleranzeige,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { Colors, Schrift } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { setzeErscheinungsbild } from '@/daten/erscheinungsbild';
import { useVerbindung, VerbindungProvider } from '@/daten/verbindung';
import { DATENBANK_NAME, migriere } from '@/db/db';
import { ladeErscheinungsbild } from '@/db/repository';
import { useSchema } from '@/hooks/use-theme';
import { importiereFallsVeraltet } from '@/import/importiere';

SplashScreen.preventAutoHideAsync();

// Sicherheitsnetz: Hängt der Start, z. B. wegen eines Fehlers beim ersten Rendern, verschwindet das
// Startbild trotzdem. Sonst bleibt die Fehlermeldung unsichtbar dahinter.
setTimeout(versteckeStartbild, 8000);

function versteckeStartbild(): void {
  SplashScreen.hideAsync().catch(() => undefined);
}

function beiDatenbankFehler(fehler: Error): void {
  versteckeStartbild();
  throw fehler;
}

/** Fehler in einem Screen: Startbild weg und die Fehleranzeige von Expo Router zeigen. */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  useEffect(versteckeStartbild, []);
  return <StandardFehleranzeige {...props} />;
}

const SCHRIFTEN = { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold };

/** So lange wartet der Start höchstens auf die Schrift, danach geht es mit der Systemschrift weiter. */
const SCHRIFT_ZEITLIMIT_MS = 3000;

/** Lädt Figtree. Bereit, sobald die Schrift geladen ist, das Laden scheitert oder das Zeitlimit abläuft. */
function useSchriftBereit(): boolean {
  const [bereit, setBereit] = useState(() => Object.keys(SCHRIFTEN).every((name) => Font.isLoaded(name)));

  useEffect(() => {
    if (bereit) return;
    const zeitlimit = setTimeout(() => {
      console.warn('Schrift lädt zu lange, Start mit der Systemschrift.');
      setBereit(true);
    }, SCHRIFT_ZEITLIMIT_MS);
    Font.loadAsync(SCHRIFTEN)
      .catch((fehler) => console.warn('Schrift konnte nicht geladen werden:', fehler))
      .finally(() => {
        clearTimeout(zeitlimit);
        setBereit(true);
      });
    return () => clearTimeout(zeitlimit);
  }, [bereit]);

  return bereit;
}

/** Übernimmt das gespeicherte Erscheinungsbild (Einstellungen → Darstellung). Bereit, sobald es gelesen ist. */
function useErscheinungsbildGeladen(): boolean {
  const db = useSQLiteContext();
  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    ladeErscheinungsbild(db)
      .then(setzeErscheinungsbild, () => undefined)
      .finally(() => setGeladen(true));
  }, [db]);

  return geladen;
}

export default function RootLayout() {
  const schema = useSchema();
  const theme = Colors[schema];
  const navigationsTheme = schema === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    // Hintergrund hinter den Screens, z. B. beim Wechsel oder unter der Tastatur.
    SystemUI.setBackgroundColorAsync(theme.grund).catch(() => undefined);
  }, [theme.grund]);

  return (
    <ThemeProvider
      value={{
        ...navigationsTheme,
        colors: { ...navigationsTheme.colors, background: theme.grund, card: theme.grund, text: theme.text },
      }}>
      {/* SQLiteProvider ist mit memo umhüllt und rendert bei neuen children nicht neu. Darum hier keine
          Props durchreichen, die sich ändern; Zustand gehört in Kontext oder in die Komponenten darunter. */}
      <SQLiteProvider databaseName={DATENBANK_NAME} onInit={migriere} onError={beiDatenbankFehler}>
        <VerbindungProvider>
          <Navigation />
        </VerbindungProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}

function Navigation() {
  const { art } = useVerbindung();
  const schriftBereit = useSchriftBereit();
  const erscheinungsbildGeladen = useErscheinungsbildGeladen();
  const schema = useSchema();
  const theme = Colors[schema];
  const geladen = art !== null && schriftBereit && erscheinungsbildGeladen;

  useEffect(() => {
    if (geladen) versteckeStartbild();
  }, [geladen]);

  if (!geladen) return null;

  // Ohne Moodle-Link und ohne Beispieldaten sind nur das Onboarding erreichbar.
  return (
    <>
      {art === 'moodle' && <AutoImport />}
      {/* Statusleiste passend zum Schema, auch wenn es vom System abweicht (Einstellungen → Darstellung). */}
      <StatusBar style={schema === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.grund },
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: Schrift.fett, fontSize: 20, color: theme.text },
          contentStyle: { backgroundColor: theme.grund },
        }}>
        <Stack.Protected guard={art !== 'keine'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]" options={{ title: 'Details' }} />
          <Stack.Screen name="modul/[id]" options={{ title: 'Modul' }} />
          <Stack.Screen name="ausgeblendet" options={{ title: 'Ausgeblendet' }} />
          {/* Eigenes Blatt mit Griff und „Abbrechen“, siehe neues-event.tsx. */}
          <Stack.Screen
            name="neues-event"
            options={{
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </Stack.Protected>
        <Stack.Screen name="onboarding" options={{ headerShown: false, title: 'Link ändern' }} />
      </Stack>
    </>
  );
}

/** Beim Öffnen und bei jeder Rückkehr in die App importieren, wenn der letzte Abruf älter als 6 Stunden ist. */
function AutoImport() {
  const db = useSQLiteContext();

  useEffect(() => {
    // Fehler landen in der Datenbank und werden in der To-do-Liste angezeigt.
    const pruefe = () => importiereFallsVeraltet(db).then(meldeAenderung, meldeAenderung);
    pruefe();
    const abo = AppState.addEventListener('change', (zustand) => {
      if (zustand === 'active') pruefe();
    });
    return () => abo.remove();
  }, [db]);

  return null;
}
