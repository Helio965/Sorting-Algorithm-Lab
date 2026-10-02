import { bubbleSort } from './bubbleSort';
import { heapSort } from './heapSort';
import { insertionSort } from './insertionSort';
import { mergeSort } from './mergeSort';
import { quickSort } from './quickSort';
import { selectionSort } from './selectionSort';
import type { AlgorithmDefinition, AlgorithmId } from './types';

export type { AlgorithmDefinition, AlgorithmId } from './types';

/** Ordem de exibição no seletor. Para adicionar um algoritmo, basta registrá-lo aqui. */
export const ALGORITHMS: readonly AlgorithmDefinition[] = [
  bubbleSort,
  quickSort,
  selectionSort,
  insertionSort,
  mergeSort,
  heapSort,
];

export const ALGORITHM_IDS: readonly AlgorithmId[] = ALGORITHMS.map((a) => a.id);

export function getAlgorithm(id: AlgorithmId): AlgorithmDefinition {
  const found = ALGORITHMS.find((a) => a.id === id);
  if (!found) throw new Error(`Algoritmo desconhecido: ${id}`);
  return found;
}

export function isAlgorithmId(value: unknown): value is AlgorithmId {
  return typeof value === 'string' && (ALGORITHM_IDS as readonly string[]).includes(value);
}
