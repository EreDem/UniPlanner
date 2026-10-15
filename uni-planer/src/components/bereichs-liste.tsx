// Liste mit Bereichen (To-do oder Erledigt): Checkbox → abhaken, Zeile antippen → Detail,
// Badge antippen → Status ändern. Verschwindet ein Eintrag durch die Änderung aus der Liste,
// gibt es unten „Rückgängig“. Unter „Nachzuarbeiten“ und bei erledigten Vorlesungen werden
// mehrere Vorlesungen eines Moduls zu einem Stapel mit Popup.

import { Check, Sparkle } from '@/components/icons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState, type ReactElement, type ReactNode } from 'react';
import { SectionList, StyleSheet, Text, View, type RefreshControlProps } from 'react-native';

import { StapelPopup } from '@/components/stapel-popup';
import { StatusAuswahl } from '@/components/status-auswahl';
import { StapelZeile, ToDoZeile } from '@/components/todo-zeile';
import { paletteFarbe } from '@/constants/farben';
import { Rand, Radius, Schrift, Spacing, Typo } from '@/constants/theme';
import { meldeAenderung } from '@/daten/aenderungen';
import { zeigeRueckgaengig } from '@/daten/rueckgaengig';
import { setzeStatus } from '@/db/repository';
import { useSchema, useTheme } from '@/hooks/use-theme';
import {
  anzeigeTitel,
  istAbgeschlossen,
  istErledigt,
  stapleNachModul,
  STATUS_TEXT,
  statusNachAbhaken,
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

/** Kurze, eindeutige Bezeichnung für die Rückgängig-Leiste, z. B. „Analysis · Mo 05.10.“. */
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

  function abhaken(eintrag: ToDoEintrag, bereich: BereichSchluessel) {
    return waehleStatus(eintrag, bereich, statusNachAbhaken(eintrag.event.typ, eintrag.status));
  }

  const statusAuswahl = (
    <StatusAuswahl
      eintrag={auswahl?.eintrag ?? null}
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: abstandUnten }}
        ListHeaderComponent={kopf}
        ListEmptyComponent={leer}
        renderSectionHeader={({ section }) => (
          <View style={[styles.bereichKopf, { backgroundColor: theme.grund }]}>
            <Text style={[Typo.abschnitt, { color: theme.text }]}>{section.titel}</Text>
            <Text style={[styles.bereichAnzahl, { color: theme.text2 }]}>{section.anzahl}</Text>
          </View>
        )}
        renderItem={({ item, section }) => (
          <View style={styles.posten}>
            {item.art === 'stapel' ? (
              <StapelZeile
                stapel={item.stapel}
                bereich={section.schluessel}
                jetztMs={jetztMs}
                onPress={() => setOffenerStapel({ bereich: section.schluessel, modulId: item.stapel.modulId })}
                onAbhaken={(eintrag) => abhaken(eintrag, section.schluessel)}
              />
            ) : (
              <ToDoZeile
                eintrag={item.eintrag}
                bereich={section.schluessel}
                jetztMs={jetztMs}
                onPress={() => oeffneDetail(item.eintrag)}
                onStatusPress={() => setAuswahl({ eintrag: item.eintrag, bereich: section.schluessel })}
                onAbhaken={() => abhaken(item.eintrag, section.schluessel)}
              />
            )}
          </View>
        )}
      />

      <StapelPopup
        eintraege={stapelEintraege}
        bereich={offenerStapel?.bereich ?? 'nachzuarbeiten'}
        jetztMs={jetztMs}
        onZeile={oeffneDetail}
        onStatus={(eintrag) => offenerStapel && setAuswahl({ eintrag, bereich: offenerStapel.bereich })}
        onAbhaken={(eintrag) => offenerStapel && abhaken(eintrag, offenerStapel.bereich)}
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
      <Text accessibilityRole="header" style={[Typo.titel, { color: theme.text }]}>
        {titel}
      </Text>
      {children}
    </View>
  );
}

/** Freundlicher Leerzustand mit kleiner Illustration. */
export function ListenLeer({ titel, text }: { titel: string; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.leer}>
      <LeerIllustration />
      <Text style={[styles.leerTitel, { color: theme.text }]}>{titel}</Text>
      <Text style={[styles.leerText, { color: theme.text2 }]}>{text}</Text>
    </View>
  );
}

/** Zwei Blätter mit abgehakten Punkten in Modulfarben und einem Funkeln. */
function LeerIllustration() {
  const theme = useTheme();
  const schema = useSchema();
  const blatt = { backgroundColor: theme.flaeche, borderColor: theme.chipRand };
  const zeilen = [
    { farbe: 'violett', breite: 34 },
    { farbe: 'petrol', breite: 26 },
    { farbe: 'orange', breite: 30 },
  ] as const;

  return (
    <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.blatt, styles.blattHinten, blatt]} />
      <View style={[styles.blatt, styles.blattVorn, blatt]}>
        {zeilen.map(({ farbe, breite }) => (
          <View key={farbe} style={styles.blattZeile}>
            <View style={[styles.blattHaken, { backgroundColor: paletteFarbe(farbe, schema) }]}>
              <Check size={10} color="#FFFFFF" strokeWidth={3.5} />
            </View>
            <View style={[styles.blattBalken, { width: breite, backgroundColor: theme.flaeche2 }]} />
          </View>
        ))}
      </View>
      <Sparkle size={20} color={theme.text2} fill={theme.text2} strokeWidth={1} style={styles.funkeln} />
    </View>
  );
}

const styles = StyleSheet.create({
  kopf: { paddingHorizontal: Rand.titel, paddingTop: Spacing.three, paddingBottom: Spacing.one, gap: Spacing.two },
  bereichKopf: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
    paddingHorizontal: Rand.titel,
    paddingTop: 20,
    paddingBottom: 10,
  },
  bereichAnzahl: { fontFamily: Schrift.halbfett, fontSize: 15 },
  posten: { marginHorizontal: Rand.karte, marginBottom: Spacing.two },
  leer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    paddingVertical: 48,
    gap: Spacing.two,
  },
  leerTitel: { fontFamily: Schrift.extrafett, fontSize: 22, lineHeight: 28, marginTop: Spacing.four },
  leerText: { fontFamily: Schrift.normal, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  illustration: { width: 112, height: 112 },
  blatt: { position: 'absolute', width: 88, height: 104, borderRadius: 14, borderWidth: 2 },
  blattHinten: { left: 16, top: 0 },
  blattVorn: { left: 8, top: 8, paddingTop: 20, paddingLeft: 14, gap: 8 },
  blattZeile: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blattHaken: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  blattBalken: { height: 8, borderRadius: Radius.chip },
  funkeln: { position: 'absolute', left: 92, top: 6 },
});
