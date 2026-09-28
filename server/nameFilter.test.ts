import { describe, expect, it } from 'vitest';
import { isOffensive } from './nameFilter.ts';

describe('name filter', () => {
  it('blocks slurs, including disguised spellings', () => {
    for (const name of [
      'nigga', 'NIGGA', 'Nigger', 'n1gga', 'n i g g a', 'n.i.g.g.e.r', 'niggaz', 'niiiggga', 'NiQQa',
      'xX_nigga_Xx', 'Big Nigga 99', 'f@ggot', 'retard', 'tranny', 'hitler', 'Hitler2',
    ]) {
      expect(isOffensive(name), name).toBe(true);
    }
  });

  it('blocks profanity as whole words', () => {
    for (const name of ['fuck', 'FuCk_boy', 'motherf', 'sh1t', 'shiiit', 's h i t', 'Big Dick', 'bitch', 'b1tch', 'a$$hole', 'c.u.n.t', 'cunt', 'Nazi', 'ashawo']) {
      expect(isOffensive(name), name).toBe(true);
    }
  });

  it('allows real names and ordinary words', () => {
    for (const name of [
      'Chinedu', 'Nigeria', 'Nigerian Queen', 'Niger', 'Shittu', 'Dickson', 'Dickens', 'Nazir', 'Kike', 'Kikelomo',
      'Hancock', 'Cockburn', 'Scunthorpe', 'Grape', 'Spice', 'Cumberbatch', 'Sussex', 'Essex', 'Analise',
      'Fukushima', 'Bassey', 'Assibi', 'Tunde', 'Ada O.', 'obinna72', 'Emeka_star', 'Snigdha', 'Penistone',
    ]) {
      expect(isOffensive(name), name).toBe(false);
    }
  });
});
