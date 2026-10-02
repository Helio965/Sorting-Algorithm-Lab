export type Preset = 'random' | 'nearly' | 'reversed' | 'sorted' | 'few-unique';

export const PRESETS: readonly { id: Preset; label: string; hint: string }[] = [
  { id: 'random', label: 'Aleatório', hint: 'Valores embaralhados' },
  { id: 'nearly', label: 'Quase ordenado', hint: 'Poucos elementos fora do lugar' },
  { id: 'reversed', label: 'Inverso', hint: 'Do maior para o menor (pior caso de vários algoritmos)' },
  { id: 'sorted', label: 'Já ordenado', hint: 'Melhor caso de Bubble e Insertion' },
  { id: 'few-unique', label: 'Muitos repetidos', hint: 'Poucos valores distintos, com duplicatas' },
];

export const VALUE_MIN = 1;
export const VALUE_MAX = 99;

export type Rng = () => number;

/** Gerador pseudoaleatório determinístico (mulberry32), útil para testes. */
export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Sorteia `count` valores distintos (quando possível) entre VALUE_MIN e VALUE_MAX. */
function distinctValues(count: number, rng: Rng): number[] {
  const pool = Array.from({ length: VALUE_MAX - VALUE_MIN + 1 }, (_, i) => VALUE_MIN + i);
  shuffle(pool, rng);
  const values = pool.slice(0, Math.min(count, pool.length));
  while (values.length < count) values.push(randomInt(rng, VALUE_MIN, VALUE_MAX));
  return values;
}

export function generateValues(count: number, preset: Preset, rng: Rng = Math.random): number[] {
  const n = Math.max(0, Math.floor(count));
  switch (preset) {
    case 'random':
      return distinctValues(n, rng);
    case 'sorted':
      return distinctValues(n, rng).sort((a, b) => a - b);
    case 'reversed':
      return distinctValues(n, rng).sort((a, b) => b - a);
    case 'nearly': {
      const values = distinctValues(n, rng).sort((a, b) => a - b);
      const swaps = Math.max(1, Math.round(n / 8));
      for (let s = 0; s < swaps && n > 1; s++) {
        const i = randomInt(rng, 0, n - 2);
        const j = Math.min(n - 1, i + randomInt(rng, 1, 2));
        [values[i], values[j]] = [values[j], values[i]];
      }
      return values;
    }
    case 'few-unique': {
      const palette = distinctValues(Math.min(4, Math.max(2, Math.ceil(n / 4))), rng);
      const values = Array.from({ length: n }, (_, i) => palette[i % palette.length]);
      return shuffle(values, rng);
    }
  }
}
