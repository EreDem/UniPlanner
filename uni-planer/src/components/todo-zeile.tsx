// Event-Zeile: links die Checkbox in der Modulfarbe (abhaken), in der Mitte Modul, Titel und Details,
// rechts das Status-Badge (volle Statusauswahl). Als Karte in den Listen oder kompakt im Stapel-Popup
// und auf der Modulseite.

import { Layers } from '@/components/icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AbhakKreis } from '@/components/abhak-kreis';
import { StatusBadge } from '@/components/status-badge';
import { modulFarbe } from '@/constants/farben';
import { kartenSchatten, Radius, Schrift, Spacing, Typo } from '@/constants/theme';
import { useSchema, useTheme } from '@/hooks/use-theme';
import {
  anzeigeTitel,
  hatStatus,
  istAbgeschlossen,
  istErledigt,
  type BereichSchluessel,
  type Stapel,
  type ToDoEintrag,
} from '@/model/types';
import { formatiere, fristText, terminText } from '@/zeit';

const DATUM_ZEIT = 'EEEEEE dd.MM., HH:mm';
/** Fläche für Checkbox bzw. Farbpunkt links; im Stapel-Popup und auf der Modulseite etwas kleiner. */
const KREIS = 22;
const KREIS_KOMPAKT = 20;
/** Höhe der Modulzeile (wie die Detailzeile) und der Pillen rechts (Status-Badge, Anzahl). */
const MODUL_ZEILE = 18;
const BADGE_HOEHE = 26;
const UHRZEIT = 'HH:mm';

/** Titel und Detailzeile einer Zeile, je nach Bereich und Darstellung. */
function texte(eintrag: ToDoEintrag, bereich: BereichSchluessel, jetztMs: number, kompakt: boolean, nurDatum: boolean) {
  const { event, status } = eintrag;
  let titel = anzeigeTitel(event);

  if (event.typ === 'abgabe') {
    const frist = formatiere(event.startMs, DATUM_ZEIT);
    let details: string;
    if (bereich === 'erledigte-abgaben') details = `Abgegeben · Frist war ${frist}`;
    else if (nurDatum || istAbgeschlossen(event.typ, status)) details = frist;
    else details = fristText(event.startMs, jetztMs);
    return { titel, details };
  }

  const uhrzeit = `${formatiere(event.startMs, UHRZEIT)}–${formatiere(event.endeMs, UHRZEIT)}`;
  let zeit: string;
  if (bereich === 'heute') zeit = uhrzeit;
  else if (kompakt && titel === 'Vorlesung') {
    // Im Popup und auf der Modulseite steht das Modul schon darüber: das Datum wird zum Titel.
    titel = formatiere(event.startMs, 'EEEEEE dd.MM.');
    zeit = uhrzeit;
  } else zeit = terminText(event.startMs, event.endeMs);
  return { titel, details: [zeit, ...event.raeume].join(' · ') };
}

export function ToDoZeile({
  eintrag,
  bereich,
  jetztMs,
  onPress,
  onStatusPress,
  onAbhaken,
  anzahl,
  zusatz,
  aktion,
  kompakt = false,
  style,
}: {
  eintrag: ToDoEintrag;
  bereich: BereichSchluessel;
  jetztMs: number;
  onPress: () => void;
  onStatusPress?: () => void;
  /** Checkbox links; fehlt sie, steht dort nur ein Punkt in der Modulfarbe. */
  onAbhaken?: () => void;
  /** Für Stapel: rechts die Anzahl statt des Status-Badges. */
  anzahl?: number;
  /** Zusätzliche Zeile unter den Details, z. B. die Punkte einer Abgabe. */
  zusatz?: string;
  /** Rechts ein Knopf statt des Status-Badges, z. B. „Einblenden“; links dann ein Streifen. */
  aktion?: { titel: string; onPress: () => void };
  /** Ohne Modulzeile, für das Stapel-Popup und die Modulseite. */
  kompakt?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const schema = useSchema();
  const { event, modul, status, ueberfaellig } = eintrag;
  const farbe = modulFarbe(event.modulId, schema);
  const { titel, details } = texte(eintrag, bereich, jetztMs, kompakt, aktion !== undefined);
  const mitStatus = hatStatus(event);

  let links;
  if (aktion) {
    links = <View style={[styles.streifen, { backgroundColor: farbe }]} />;
  } else if (mitStatus && onAbhaken) {
    links = (
      <AbhakKreis
        farbe={farbe}
        abgehakt={istErledigt(event.typ, status)}
        onPress={onAbhaken}
        beschriftung={titel}
        groesse={kompakt ? KREIS_KOMPAKT : KREIS}
      />
    );
  } else {
    links = (
      <View style={styles.punktFlaeche}>
        <View style={[styles.punkt, { backgroundColor: farbe }]} />
      </View>
    );
  }

  let rechts = null;
  if (aktion) {
    rechts = (
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={aktion.onPress}
        style={({ pressed }) => [styles.aktion, { backgroundColor: theme.flaeche2, opacity: pressed ? 0.7 : 1 }]}>
        <Text style={[styles.aktionText, { color: theme.text }]}>{aktion.titel}</Text>
      </Pressable>
    );
  } else if (anzahl !== undefined) {
    rechts = (
      <View style={[styles.anzahl, { backgroundColor: theme.primaer }]}>
        <Layers size={13} color={theme.primaerText} strokeWidth={2.4} />
        <Text style={[styles.anzahlText, { color: theme.primaerText }]}>{anzahl}</Text>
      </View>
    );
  } else if (mitStatus) {
    rechts = <StatusBadge typ={event.typ} status={status} ueberfaellig={ueberfaellig} onPress={onStatusPress} />;
  }

  const textBlock = (
    <>
      <Text numberOfLines={2} style={[Typo.eintrag, { color: theme.text }]}>
        {titel}
      </Text>
      <Text style={[Typo.details, { color: ueberfaellig ? theme.gefahr : theme.text2 }]}>{details}</Text>
      {zusatz && <Text style={[styles.zusatz, { color: theme.text }]}>{zusatz}</Text>}
      {event.entferntMs !== null && (
        <Text style={[Typo.details, { color: theme.warnungText }]}>Aus Moodle entfernt</Text>
      )}
    </>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={anzahl === undefined ? 'Öffnet die Details' : `${anzahl} Vorlesungen, öffnet die Liste`}
      onPress={onPress}
      style={({ pressed }) => [
        kompakt ? styles.kompakt : [styles.karte, kartenSchatten(schema)],
        aktion && styles.mitAktion,
        { backgroundColor: theme.flaeche, opacity: pressed ? 0.85 : 1 },
        style,
      ]}>
      {kompakt ? (
        <>
          <View style={[styles.links, styles.linksKompakt]}>{links}</View>
          <View style={styles.inhalt}>{textBlock}</View>
          <View style={styles.rechtsKompakt}>{rechts}</View>
        </>
      ) : aktion ? (
        <>
          <View style={styles.linksStreifen}>{links}</View>
          <View style={styles.inhalt}>
            <Text numberOfLines={1} style={[styles.modul, { color: theme.text2 }]}>
              {modul?.name ?? 'Ohne Modul'}
            </Text>
            {textBlock}
          </View>
          {rechts}
        </>
      ) : (
        <View style={styles.inhalt}>
          {/* Modulzeile eingerückt, damit Kreis und Titel in einer Zeile stehen. */}
          <View style={[styles.kopf, styles.eingerueckt]}>
            <Text numberOfLines={1} style={[styles.modul, { color: theme.text2 }]}>
              {modul?.name ?? 'Ohne Modul'}
            </Text>
            {/* Das Badge ragt über die Modulzeile hinaus, statt sie höher zu machen. */}
            <View style={styles.rechtsKopf}>{rechts}</View>
          </View>
          <View style={styles.titelZeile}>
            <View style={styles.links}>{links}</View>
            <View style={styles.inhalt}>{textBlock}</View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Mehrere Vorlesungen eines Moduls: zeigt die erste des Stapels mit der Anzahl, dahinter
 * angedeutete Karten. Die Checkbox hakt die gezeigte Vorlesung ab.
 */
export function StapelZeile({
  stapel,
  bereich,
  jetztMs,
  onPress,
  onAbhaken,
}: {
  stapel: Stapel;
  bereich: BereichSchluessel;
  jetztMs: number;
  onPress: () => void;
  onAbhaken: (eintrag: ToDoEintrag) => void;
}) {
  const theme = useTheme();
  const schema = useSchema();
  const erster = stapel.eintraege[0];
  const angedeutet = [
    { einzug: 16, unten: 0 },
    { einzug: 8, unten: 5 },
  ];

  return (
    <View style={styles.stapel}>
      {angedeutet.map(({ einzug, unten }) => (
        <View
          key={einzug}
          style={[
            styles.angedeutet,
            kartenSchatten(schema),
            { left: einzug, right: einzug, bottom: unten, backgroundColor: theme.flaeche, borderColor: theme.linie },
            schema === 'dark' && styles.angedeutetRand,
          ]}
        />
      ))}
      <ToDoZeile
        eintrag={erster}
        bereich={bereich}
        jetztMs={jetztMs}
        anzahl={stapel.eintraege.length}
        onPress={onPress}
        onAbhaken={() => onAbhaken(erster)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Oben und unten gleich viel Innenabstand, Modul- und Detailzeile gleich hoch:
  // so liegt der Titel (und mit ihm der Kreis) bei einzeiligen Details genau in der Mitte.
  karte: {
    flexDirection: 'row',
    borderRadius: Radius.karte,
    paddingVertical: 14,
    paddingLeft: 17,
    paddingRight: 14,
  },
  mitAktion: { alignItems: 'center', paddingTop: 12 },
  kompakt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.knopf,
    paddingVertical: 10,
    paddingLeft: 17,
    paddingRight: 12,
    gap: Spacing.two + 4,
  },
  // Kreis (22) mittig auf der ersten Titelzeile.
  links: { width: KREIS, alignItems: 'center', marginTop: (Typo.eintrag.lineHeight - KREIS) / 2, marginRight: 21 },
  linksStreifen: { alignSelf: 'stretch', marginLeft: -3, marginRight: 12 },
  linksKompakt: { marginTop: (Typo.eintrag.lineHeight - KREIS_KOMPAKT) / 2, marginRight: 8 },
  rechtsKompakt: { alignSelf: 'center' },
  inhalt: { flex: 1, minWidth: 0, gap: 2 },
  kopf: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  eingerueckt: { paddingLeft: KREIS + 21, minHeight: MODUL_ZEILE },
  rechtsKopf: { marginVertical: (MODUL_ZEILE - BADGE_HOEHE) / 2 },
  titelZeile: { flexDirection: 'row', alignItems: 'flex-start' },
  modul: { flex: 1, fontFamily: Schrift.halbfett, fontSize: 13, lineHeight: MODUL_ZEILE },
  zusatz: { fontFamily: Schrift.fett, fontSize: 13, lineHeight: 18 },
  punktFlaeche: { width: KREIS, height: KREIS, alignItems: 'center', justifyContent: 'center' },
  punkt: { width: 8, height: 8, borderRadius: 4 },
  streifen: { flex: 1, width: 6, borderRadius: 3 },
  anzahl: {
    height: BADGE_HOEHE,
    borderRadius: BADGE_HOEHE / 2,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anzahlText: { fontFamily: Schrift.fett, fontSize: 12 },
  aktion: { minHeight: 40, borderRadius: Radius.feld, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  aktionText: { fontFamily: Schrift.fett, fontSize: 14 },
  stapel: { paddingBottom: 10 },
  angedeutet: { position: 'absolute', height: 30, borderRadius: Radius.karte },
  angedeutetRand: { borderWidth: StyleSheet.hairlineWidth },
});
