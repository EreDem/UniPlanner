import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { meldeAenderung } from '@/daten/aenderungen';
import { useVerbindung, VerbindungProvider } from '@/daten/verbindung';
import { DATENBANK_NAME, migriere } from '@/db/db';
import { useSchema } from '@/hooks/use-theme';
import { importiereFallsVeraltet } from '@/import/importiere';

SplashScreen.preventAutoHideAsync();

function beiDatenbankFehler(fehler: Error): void {
  SplashScreen.hideAsync();
  throw fehler;
}

export default function RootLayout() {
  const schema = useSchema();
  return (
    <ThemeProvider value={schema === 'dark' ? DarkTheme : DefaultTheme}>
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
  const geladen = art !== null;

  useEffect(() => {
    if (geladen) SplashScreen.hideAsync();
  }, [geladen]);

  if (!geladen) return null;

  // Ohne Moodle-Link und ohne Beispieldaten sind nur das Onboarding erreichbar.
  return (
    <>
      {art === 'moodle' && <AutoImport />}
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Protected guard={art !== 'keine'}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]" options={{ title: 'Details' }} />
          <Stack.Screen name="modul/[id]" options={{ title: 'Modul' }} />
          <Stack.Screen name="ausgeblendet" options={{ title: 'Ausgeblendet' }} />
          <Stack.Screen name="neues-event" options={{ presentation: 'modal', title: 'Neues Event' }} />
        </Stack.Protected>
        <Stack.Screen name="onboarding" options={{ title: 'Moodle verbinden' }} />
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
