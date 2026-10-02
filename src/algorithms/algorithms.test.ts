import { describe, expect, it } from 'vitest';
import { runAlgorithm } from '../engine/run';
import { frameValues } from '../engine/frames';
import type { Trace } from '../engine/types';
import { createRng, generateValues, type Preset } from '../utils/random';
import { ALGORITHMS } from './index';

const ascending = (values: readonly number[]) => [...values].sort((a, b) => a - b);

const CASES: Record<string, number[]> = {
  'exemplo [8,3,5,1]': [8, 3, 5, 1],
  'números repetidos': [5, 1, 5, 3, 1, 5],
  'vetor já ordenado': [1, 2, 3, 4, 5, 6, 7],
  'vetor inverso': [9, 8, 7, 6, 5, 4, 3, 2, 1],
  'conjunto pequeno': [2, 1],
  'um elemento': [42],
  'vetor vazio': [],
  'números negativos': [-3, 10, -50, 0, 7, -1],
  'todos iguais': [4, 4, 4, 4],
  'valores duplicados intercalados': [3, 1, 2, 3, 1, 2, 3, 1],
};

describe.each(ALGORITHMS.map((a) => [a.name, a] as const))('%s', (_name, algorithm) => {
  it('ordena [8, 3, 5, 1] em [1, 3, 5, 8]', () => {
    expect(runAlgorithm(algorithm, [8, 3, 5, 1]).output).toEqual([1, 3, 5, 8]);
  });

  it.each(Object.entries(CASES))('ordena corretamente: %s', (_label, input) => {
    const trace = runAlgorithm(algorithm, input);
    expect(trace.output).toEqual(ascending(input));
  });

  it('ordena 300 vetores aleatórios de todos os tipos', () => {
    const rng = createRng(1234);
    const presets: Preset[] = ['random', 'nearly', 'reversed', 'sorted', 'few-unique'];
    for (let round = 0; round < 300; round++) {
      const size = 1 + Math.floor(rng() * 50);
      const input = generateValues(size, presets[round % presets.length], rng);
      expect(runAlgorithm(algorithm, input).output).toEqual(ascending(input));
    }
  });

  it('não altera o vetor de entrada', () => {
    const input = [5, 2, 9, 1];
    runAlgorithm(algorithm, input);
    expect(input).toEqual([5, 2, 9, 1]);
  });
});

describe('todos os algoritmos', () => {
  it('produzem exatamente a mesma sequência final', () => {
    const rng = createRng(99);
    for (let round = 0; round < 50; round++) {
      const input = generateValues(3 + Math.floor(rng() * 48), round % 2 ? 'few-unique' : 'random', rng);
      const outputs = ALGORITHMS.map((a) => runAlgorithm(a, input).output);
      for (const output of outputs) expect(output).toEqual(outputs[0]);
    }
  });
});

// ---------------------------------------------------------------------------
// Implementações de referência, sem instrumentação, usadas para confirmar que
// as métricas exibidas vêm da execução real.

interface Counts {
  comparisons: number;
  swaps: number;
}

function refBubble(input: number[]): Counts {
  const a = [...input];
  const c = { comparisons: 0, swaps: 0 };
  for (let i = 0; i < a.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - i - 1; j++) {
      c.comparisons++;
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        c.swaps++;
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return c;
}

function refSelection(input: number[]): Counts {
  const a = [...input];
  const c = { comparisons: 0, swaps: 0 };
  for (let i = 0; i < a.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < a.length; j++) {
      c.comparisons++;
      if (a[j] < a[min]) min = j;
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min], a[i]];
      c.swaps++;
    }
  }
  return c;
}

function refInsertion(input: number[]): Counts & { shifts: number } {
  const a = [...input];
  const c = { comparisons: 0, swaps: 0, shifts: 0 };
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0) {
      c.comparisons++;
      if (!(a[j] > key)) break;
      a[j + 1] = a[j];
      c.shifts++;
      j--;
    }
    a[j + 1] = key;
  }
  return c;
}

function refQuick(input: number[]): Counts & { calls: number } {
  const a = [...input];
  const c = { comparisons: 0, swaps: 0, calls: 0 };
  const sort = (lo: number, hi: number) => {
    c.calls++;
    if (lo >= hi) return;
    const pivot = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      c.comparisons++;
      if (a[j] < pivot) {
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          c.swaps++;
        }
        i++;
      }
    }
    if (i !== hi) {
      [a[i], a[hi]] = [a[hi], a[i]];
      c.swaps++;
    }
    sort(lo, i - 1);
    sort(i + 1, hi);
  };
  if (a.length) sort(0, a.length - 1);
  return c;
}

function refMerge(input: number[]): Counts & { calls: number } {
  const a = [...input];
  const aux: number[] = [];
  const c = { comparisons: 0, swaps: 0, calls: 0 };
  const sort = (lo: number, hi: number) => {
    c.calls++;
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sort(lo, mid);
    sort(mid + 1, hi);
    for (let k = lo; k <= hi; k++) aux[k] = a[k];
    let i = lo;
    let j = mid + 1;
    for (let k = lo; k <= hi; k++) {
      if (i > mid) a[k] = aux[j++];
      else if (j > hi) a[k] = aux[i++];
      else {
        c.comparisons++;
        if (aux[j] < aux[i]) a[k] = aux[j++];
        else a[k] = aux[i++];
      }
    }
  };
  if (a.length) sort(0, a.length - 1);
  return c;
}

function refHeap(input: number[]): Counts {
  const a = [...input];
  const c = { comparisons: 0, swaps: 0 };
  const sift = (start: number, size: number) => {
    let root = start;
    while (2 * root + 1 < size) {
      let child = 2 * root + 1;
      if (child + 1 < size) {
        c.comparisons++;
        if (a[child + 1] > a[child]) child++;
      }
      c.comparisons++;
      if (a[root] >= a[child]) return;
      [a[root], a[child]] = [a[child], a[root]];
      c.swaps++;
      root = child;
    }
  };
  for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) sift(i, a.length);
  for (let end = a.length - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    c.swaps++;
    sift(0, end);
  }
  return c;
}

const REFERENCES: Record<string, (input: number[]) => Counts & Partial<{ calls: number; shifts: number }>> = {
  bubble: refBubble,
  selection: refSelection,
  insertion: refInsertion,
  quick: refQuick,
  merge: refMerge,
  heap: refHeap,
};

function lastMetrics(trace: Trace) {
  return trace.frames[trace.frames.length - 1].metrics;
}

describe('métricas vêm da execução real', () => {
  it.each(ALGORITHMS.map((a) => [a.name, a] as const))('%s confere com a implementação de referência', (_name, algorithm) => {
    const rng = createRng(7);
    for (let round = 0; round < 60; round++) {
      const input = generateValues(1 + Math.floor(rng() * 40), round % 3 ? 'random' : 'few-unique', rng);
      const expected = REFERENCES[algorithm.id](input);
      const metrics = lastMetrics(runAlgorithm(algorithm, input));
      expect(metrics.comparisons).toBe(expected.comparisons);
      expect(metrics.swaps).toBe(expected.swaps);
      if (expected.calls !== undefined) expect(metrics.calls).toBe(expected.calls);
      if (expected.shifts !== undefined) expect(metrics.shifts).toBe(expected.shifts);
    }
  });

  it('Selection Sort sempre faz n(n−1)/2 comparações', () => {
    const selection = ALGORITHMS.find((a) => a.id === 'selection')!;
    for (const n of [3, 8, 20]) {
      const metrics = lastMetrics(runAlgorithm(selection, generateValues(n, 'sorted', createRng(n))));
      expect(metrics.comparisons).toBe((n * (n - 1)) / 2);
    }
  });

  it('Bubble Sort em vetor ordenado faz uma única passada (melhor caso O(n))', () => {
    const bubble = ALGORITHMS.find((a) => a.id === 'bubble')!;
    const metrics = lastMetrics(runAlgorithm(bubble, [1, 2, 3, 4, 5, 6, 7, 8]));
    expect(metrics.comparisons).toBe(7);
    expect(metrics.swaps).toBe(0);
    expect(metrics.passes).toBe(1);
  });
});

describe('consistência dos quadros', () => {
  it.each(ALGORITHMS.map((a) => [a.name, a] as const))('%s: nenhum elemento é perdido ou duplicado', (_name, algorithm) => {
    const input = generateValues(25, 'random', createRng(5));
    const trace = runAlgorithm(algorithm, input);
    for (const frame of trace.frames) {
      const ids = [...frame.main, ...(frame.aux ?? []), frame.held?.id ?? null].filter((id): id is number => id !== null);
      expect(ids.sort((a, b) => a - b)).toEqual(input.map((_, i) => i));
    }
  });

  it.each(ALGORITHMS.map((a) => [a.name, a] as const))('%s: o último quadro mostra o vetor ordenado', (_name, algorithm) => {
    const input = [14, 8, 2, 19, 6, 3, 11, 5, 17, 1, 9, 20, 4, 13, 7];
    const trace = runAlgorithm(algorithm, input);
    const last = trace.frames[trace.frames.length - 1];
    expect(frameValues(last, input)).toEqual(ascending(input));
    expect(last.sorted.every(Boolean)).toBe(true);
    expect(last.action.type).toBe('done');
    expect(last.held).toBeNull();
  });

  it.each(ALGORITHMS.map((a) => [a.name, a] as const))('%s: linhas de código e mensagens válidas', (_name, algorithm) => {
    const trace = runAlgorithm(algorithm, generateValues(12, 'random', createRng(3)));
    for (const frame of trace.frames) {
      expect(frame.message.length).toBeGreaterThan(0);
      if (frame.line !== null) {
        expect(frame.line).toBeGreaterThanOrEqual(1);
        expect(frame.line).toBeLessThanOrEqual(algorithm.code.lines.length);
      }
    }
    expect(trace.frames.map((f) => f.step)).toEqual(trace.frames.map((_, i) => i));
  });

  it.each(ALGORITHMS.map((a) => [a.name, a] as const))('%s: comparações nos quadros = eventos de comparação', (_name, algorithm) => {
    const trace = runAlgorithm(algorithm, generateValues(18, 'random', createRng(11)));
    const compareEvents = trace.events.filter((e) => e.type === 'compare').length;
    expect(lastMetrics(trace).comparisons).toBe(compareEvents);
  });

  it('Quick Sort registra a árvore de chamadas recursivas', () => {
    const quick = ALGORITHMS.find((a) => a.id === 'quick')!;
    const trace = runAlgorithm(quick, [5, 2, 8, 1, 9, 3]);
    expect(trace.calls[0].name).toBe('quickSort(0, 5)');
    expect(trace.calls[0].parent).toBeNull();
    expect(trace.calls.length).toBe(lastMetrics(trace).calls);
    for (const call of trace.calls) {
      expect(call.endStep).toBeGreaterThanOrEqual(call.startStep);
      if (call.parent !== null) expect(trace.calls[call.parent].children).toContain(call.id);
    }
  });
});
