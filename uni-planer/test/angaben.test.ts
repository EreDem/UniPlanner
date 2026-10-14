import { formatierePunkte, lesePunkte, pruefePunkte } from '@/model/angaben';

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
