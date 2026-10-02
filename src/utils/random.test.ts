import { describe, expect, it } from 'vitest';
import { createRng, generateValues, PRESETS, VALUE_MAX, VALUE_MIN } from './random';

describe('generateValues', () => {
  it.each(PRESETS.map((p) => p.id))('gera a quantidade pedida dentro do intervalo (%s)', (preset) => {
    for (const count of [3, 8, 50]) {
      const values = generateValues(count, preset, createRng(count));
      expect(values).toHaveLength(count);
      for (const v of values) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(VALUE_MIN);
        expect(v).toBeLessThanOrEqual(VALUE_MAX);
      }
    }
  });

  it('é determinístico com a mesma semente', () => {
    expect(generateValues(20, 'random', createRng(42))).toEqual(generateValues(20, 'random', createRng(42)));
  });

  it('respeita as ordens dos presets', () => {
    const sorted = generateValues(10, 'sorted', createRng(1));
    expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
    const reversed = generateValues(10, 'reversed', createRng(1));
    expect(reversed).toEqual([...reversed].sort((a, b) => b - a));
    const few = generateValues(20, 'few-unique', createRng(1));
    expect(new Set(few).size).toBeLessThanOrEqual(4);
  });
});
