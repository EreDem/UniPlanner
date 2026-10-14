import { formatierePunkte, formatiereProzent, lesePunkte, pruefePunkte, summierePunkte } from '@/model/angaben';

describe('summierePunkte', () => {
  it('summiert erreichte und mögliche Punkte und berechnet den Anteil', () => {
    expect(
      summierePunkte([
        { erreicht: 7.5, max: 10 },
        { erreicht: 8, max: 10 },
        { erreicht: 8, max: 10 },
      ]),
    ).toEqual({ erreicht: 23.5, max: 30, prozent: 78.3, bewertet: 3 });
  });

  it('zählt nur Abgaben mit beiden Werten', () => {
    expect(
      summierePunkte([
        { erreicht: 5, max: 10 },
        { erreicht: null, max: 10 },
        { erreicht: 3, max: null },
        { erreicht: null, max: null },
      ]),
    ).toEqual({ erreicht: 5, max: 10, prozent: 50, bewertet: 1 });
  });

  it('rundet Gleitkommafehler weg', () => {
    expect(summierePunkte([{ erreicht: 0.1, max: 0.2 }, { erreicht: 0.2, max: 0.1 }])).toMatchObject({
      erreicht: 0.3,
      max: 0.3,
      prozent: 100,
    });
  });

  it('hat ohne bewertete Abgaben keinen Anteil', () => {
    expect(summierePunkte([])).toEqual({ erreicht: 0, max: 0, prozent: null, bewertet: 0 });
  });

  it('zeigt den Anteil mit Komma', () => {
    expect(formatiereProzent(78.3)).toBe('78,3 %');
    expect(formatiereProzent(100)).toBe('100 %');
  });
});

describe('lesePunkte', () => {
  it('liest ganze Zahlen und Dezimalzahlen mit Komma oder Punkt', () => {
    expect(lesePunkte('7')).toBe(7);
    expect(lesePunkte('7,5')).toBe(7.5);
    expect(lesePunkte(' 7.25 ')).toBe(7.25);
    expect(lesePunkte('0')).toBe(0);
  });

  it('gibt für leere Eingaben null zurück', () => {
    expect(lesePunkte('')).toBeNull();
    expect(lesePunkte('  ')).toBeNull();
  });

  it('lehnt alles andere ab', () => {
    for (const eingabe of ['-1', '7,555', '1/2', 'abc', '7,', ',5', '1e3', '10001']) {
      expect([eingabe, lesePunkte(eingabe)]).toEqual([eingabe, undefined]);
    }
  });
});

describe('pruefePunkte', () => {
  it('gibt beide Werte als Zahlen zurück', () => {
    expect(pruefePunkte('7,5', '10')).toEqual({ erreicht: 7.5, max: 10 });
    expect(pruefePunkte('', '10')).toEqual({ erreicht: null, max: 10 });
    expect(pruefePunkte('', '')).toEqual({ erreicht: null, max: null });
  });

  it('erlaubt Bonuspunkte über dem Maximum', () => {
    expect(pruefePunkte('12', '10')).toEqual({ erreicht: 12, max: 10 });
  });

  it('meldet ungültige Eingaben verständlich', () => {
    expect(pruefePunkte('sieben', '10')).toEqual({ fehler: 'Bitte nur Zahlen eingeben, z. B. 7,5.' });
    expect(pruefePunkte('5', '0')).toEqual({ fehler: 'Die maximale Punktzahl muss größer als 0 sein.' });
  });
});

describe('formatierePunkte', () => {
  it('zeigt Dezimalzahlen mit Komma', () => {
    expect(formatierePunkte(7.5)).toBe('7,5');
    expect(formatierePunkte(10)).toBe('10');
    expect(formatierePunkte(null)).toBe('');
  });
});
