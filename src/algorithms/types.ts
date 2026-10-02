import type { CodeListing } from '../engine/code';
import type { Tracer } from '../engine/tracer';
import type { MetricKey } from '../engine/types';

export type AlgorithmId = 'bubble' | 'selection' | 'insertion' | 'quick' | 'merge' | 'heap';

export interface Complexity {
  best: string;
  average: string;
  worst: string;
  space: string;
}

export interface AlgorithmDefinition {
  id: AlgorithmId;
  name: string;
  /** Subtítulo curto, exibido junto ao nome. */
  tagline: string;
  description: string;
  /** Etapas do funcionamento em linguagem simples. */
  steps: string[];
  complexity: Complexity;
  /** Explicação curta do porquê das complexidades. */
  complexityNote: string;
  stable: boolean;
  inPlace: boolean;
  /** Usa o vetor auxiliar (exibe a bancada auxiliar na animação). */
  usesAux: boolean;
  /** Possui chamadas recursivas (exibe a árvore de recursão). */
  recursive: boolean;
  /** Métricas específicas exibidas além das principais. */
  extraMetrics: { key: MetricKey; label: string; hint: string }[];
  code: CodeListing;
  /** Executa o algoritmo de verdade sobre o Tracer. */
  run(t: Tracer): void;
}
