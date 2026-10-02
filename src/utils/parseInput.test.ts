import { describe, expect, it } from 'vitest';
import { clampCount, parseValues } from './parseInput';

describe('parseValues', () => {
  it('aceita números separados por vírgula', () => {
    expect(parseValues('12, 4, 28, 7, 15, 2, 31, 10')).toEqual({ ok: true, values: [12, 4, 28, 7, 15, 2, 31, 10] });
  });

  it('aceita espaços, ponto e vírgula e quebras de linha', () => {
    expect(parseValues('3 1;2\n5')).toEqual({ ok: true, values: [3, 1, 2, 5] });
  });

  it('aceita números negativos e repetidos', () => {
    expect(parseValues('-5, 3, -5, 0')).toEqual({ ok: true, values: [-5, 3, -5, 0] });
  });

  it.each([
    ['', 'vazio'],
    ['   ', 'só espaços'],
    ['1, 2', 'menos de 3 números'],
    ['1, , 2, 3', 'vírgulas repetidas'],
    ['1, abc, 3', 'texto'],
    ['1, 2.5, 3', 'decimal'],
    ['1, 2, 1000', 'acima do limite'],
    ['1, 2, -1000', 'abaixo do limite'],
    ['1, 2, 3e5', 'notação científica'],
    [Array.from({ length: 51 }, (_, i) => i).join(','), 'mais de 50 números'],
  ])('rejeita entrada inválida: %j (%s)', (text) => {
    const result = parseValues(text);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});

describe('clampCount', () => {
  it('mantém a quantidade entre 3 e 50', () => {
    expect(clampCount(1)).toBe(3);
    expect(clampCount(8)).toBe(8);
    expect(clampCount(80)).toBe(50);
    expect(clampCount(Number.NaN)).toBe(3);
  });
});
