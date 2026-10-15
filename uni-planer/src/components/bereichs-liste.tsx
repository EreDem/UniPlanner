// Liste mit Bereichen (To-do oder Erledigt): Zeile antippen → Detail, Badge antippen → Status ändern.
// Verschwindet ein Eintrag durch die Änderung aus der Liste, gibt es unten „Rückgängig“.
// Unter „Nachzuarbeiten“ und bei erledigten Vorlesungen werden mehrere Vorlesungen eines Moduls
// zu einem Stapel mit Popup.

import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, type ReactElement, type ReactNode } from 'react';
import { SectionList, StyleSheet, Text, View, type RefreshControlProps } from 'react-native';

import { StapelPopup } from '@/components/stapel-popup';
import { StatusAuswahl } from '@/components/status-auswahl';
import { StapelZeile, ToDoZeile } from '@/components/todo-zeile';
import { Spacing } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { zeigeRueckgaengig } from '@/daten/rueckgaengig';
import { setzeStatus } from '@/db/repository';
import { useTheme } from '@/hooks/use-theme';
import {
  anzeigeTitel,
  istAbgeschlossen,
  istErledigt,
  stapleNachModul,
  STATUS_TEXT,
  type BereichSchluessel,
  type EventTyp,
  type ListenPosten,
  type Status,
  type ToDoBereich,
  type ToDoEintrag,
} from '@/model/types';
import { formatiere } from '@/zeit';

/** In diesen Bereichen werden mehrere Vorlesungen eines Moduls zu einem Stapel. */
const GESTAPELTE_BEREICHE: readonly BereichSchluessel[] = ['nachzuarbeiten', 'erledigte-vorlesungen'];

/**
 * Bleibt ein Eintrag mit diesem Status in seinem Bereich? Erledigt-Tab: nur Erledigtes
 * (verpasste Abgaben nicht). To-do-Liste: nur, was noch zu tun ist.
 */
function gehoertInBereich(bereich: BereichSchluessel, typ: EventTyp, status: Status): boolean {
  if (bereich === 'erledigte-abgaben' || bereich === 'erledigte-vorlesungen') return istErledigt(typ, status);
  return !istAbgeschlossen(typ, status);
}

/** Kurze, eindeutige Bezeichnung für Statusauswahl und Rückgängig-Leiste, z. B. „Analysis · Mo 05.10.“. */
export function bezeichnung({ event, modul }: ToDoEintrag): string {
  const titel = anzeigeTitel(event);
  if (titel !== 'Vorlesung' || !modul) return titel;
  return `${modul.name} · ${formatiere(event.startMs, 'EEEEEE dd.MM.')}`;
}

export function BereichsListe({
  bereiche,
  gespeicherterStatus,
  jetztMs,
  kopf,
  leer,
  abstandUnten,
  refreshControl,
}: {
  bereiche: ToDoBereich[];
  /** Gespeicherte Status vor der Änderung, damit „Rückgängig“ auch den Standard wiederherstellt. */
  gespeicherterStatus: ReadonlyMap<string, Status>;
  jetztMs: number;
  kopf: ReactElement;
  leer: ReactElement;
  abstandUnten: number;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [auswahl, setAuswahl] = useState<{ eintrag: ToDoEintrag; bereich: BereichSchluessel } | null>(null);
  const [offenerStapel, setOffenerStapel] = useState<{ bereich: BereichSchluessel; modulId: string } | null>(null);

  // Der Popup-Inhalt kommt immer aus den aktuellen Daten, damit Abgehaktes sofort verschwindet.
  const stapelEintraege = offenerStapel
    ? (bereiche.find((b) => b.schluessel === offenerStapel.bereich)?.eintraege ?? []).filter(
        (eintrag) => eintrag.event.modulId === offenerStapel.modulId,
      )
    : [];

  function oeffneDetail(eintrag: ToDoEintrag) {
    setOffenerStapel(null);
    router.push({ pathname: '/event/[id]', params: { id: eintrag.event.id } });
  }

  async function waehleStatus(eintrag: ToDoEintrag, bereich: BereichSchluessel, neu: Status) {
    setAuswahl(null);
    const { event, status: alt } = eintrag;
    if (neu === alt) return;

    const vorher = gespeicherterStatus.get(event.id) ?? null;
    await setzeStatus(db, event.id, neu);
    meldeAenderung();

    // Rückgängig nur, wenn der Eintrag dadurch aus dieser Liste verschwindet. Unter „Heute“ bleibt er stehen.
    if (bereich !== 'heute' && !gehoertInBereich(bereich, event.typ, neu)) {
      // War das die letzte Vorlesung im offenen Stapel, schließt sich das Popup.
      if (stapelEintraege.length <= 1 && stapelEintraege.some((e) => e.event.id === event.id)) setOffenerStapel(null);
      zeigeRueckgaengig(
        istAbgeschlossen(event.typ, neu)
          ? `${STATUS_TEXT[neu]}: ${bezeichnung(eintrag)}`
          : `Wieder offen: ${bezeichnung(eintrag)}`,
        async () => {
          await setzeStatus(db, event.id, vorher);
          meldeAenderung();
        },
      );
    }
  }

  const statusAuswahl = (
    <StatusAuswahl
      auswahl={
        auswahl && {
          titel: bezeichnung(auswahl.eintrag),
          typ: auswahl.eintrag.event.typ,
          status: auswahl.eintrag.status,
        }
      }
      onWaehle={(status) => auswahl && waehleStatus(auswahl.eintrag, auswahl.bereich, status)}
      onSchliessen={() => setAuswahl(null)}
    />
  );

  return (
    <>
      <SectionList
        sections={bereiche.map((bereich) => ({
          ...bereich,
          anzahl: bereich.eintraege.length,
          data: GESTAPELTE_BEREICHE.includes(bereich.schluessel)
            ? stapleNachModul(bereich.eintraege)
            : bereich.eintraege.map((eintrag): ListenPosten => ({ art: 'eintrag', eintrag })),
        }))}
        keyExtractor={(posten) =>
          posten.art === 'stapel' ? `stapel:${posten.stapel.modulId}` : posten.eintrag.event.id
        }
        stickySectionHeadersEnabled
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingBottom: abstandUnten }}
        ListHeaderComponent={kopf}
        ListEmptyComponent={leer}
        renderSectionHeader={({ section }) => (
          <View style={[styles.bereichKopf, { backgroundColor: theme.background }]}>
            <Text style={[styles.bereichTitel, { color: theme.text }]}>{section.titel}</Text>
            <Text style={[styles.bereichAnzahl, { color: theme.textSecondary }]}>{section.anzahl}</Text>
          </View>
        )}
        renderItem={({ item, section }) =>
          item.art === 'stapel' ? (
            <StapelZeile
              stapel={item.stapel}
              bereich={section.schluessel}
              jetztMs={jetztMs}
              onPress={() => setOffenerStapel({ bereich: section.schluessel, modulId: item.stapel.modulId })}
            />
          ) : (
            <ToDoZeile
              eintrag={item.eintrag}
              bereich={section.schluessel}
              jetztMs={jetztMs}
              onPress={() => oeffneDetail(item.eintrag)}
              onStatusPress={() => setAuswahl({ eintrag: item.eintrag, bereich: section.schluessel })}
            />
          )
        }
      />

      <StapelPopup
        eintraege={stapelEintraege}
        bereich={offenerStapel?.bereich ?? 'nachzuarbeiten'}
        jetztMs={jetztMs}
        onZeile={oeffneDetail}
        onStatus={(eintrag) => offenerStapel && setAuswahl({ eintrag, bereich: offenerStapel.bereich })}
        onSchliessen={() => setOffenerStapel(null)}>
        {/* Im Popup gerendert, damit die Statusauswahl darüber erscheint. */}
        {stapelEintraege.length > 0 && statusAuswahl}
      </StapelPopup>
      {stapelEintraege.length === 0 && statusAuswahl}
    </>
  );
}

/** Kopf mit großem Titel und optionalem Inhalt darunter. */
export function ListenKopf({ titel, children }: { titel: string; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.kopf}>
      <Text style={[styles.titel, { color: theme.text }]}>{titel}</Text>
      {children}
    </View>
  );
}

/** Freundlicher Leerzustand. */
export function ListenLeer({ titel, text }: { titel: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.leer}>
      <Text style={[styles.leerTitel, { color: theme.text }]}>{titel}</Text>
      <Text style={[styles.leerText, { color: theme.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kopf: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.two },
  titel: { fontSize: 32, fontWeight: '700' },
  bereichKopf: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  bereichTitel: { fontSize: 20, fontWeight: '700' },
  bereichAnzahl: { fontSize: 15, fontWeight: '500' },
  leer: { alignItems: 'center', paddingHorizontal: Spacing.five, paddingTop: Spacing.six, gap: Spacing.two },
  leerTitel: { fontSize: 22, fontWeight: '700' },
  leerText: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
});
