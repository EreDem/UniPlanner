import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Aktuelle Zeit, jede Minute und beim Zurückkehren in die App aktualisiert. */
export function useJetzt(intervallMs = 60_000): number {
  const [jetzt, setJetzt] = useState(Date.now);

  useEffect(() => {
    const aktualisiere = () => setJetzt(Date.now());
    const timer = setInterval(aktualisiere, intervallMs);
    const abo = AppState.addEventListener('change', (zustand) => {
      if (zustand === 'active') aktualisiere();
    });
    return () => {
      clearInterval(timer);
      abo.remove();
    };
  }, [intervallMs]);

  return jetzt;
}
