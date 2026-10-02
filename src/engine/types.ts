/**
 * Tipos centrais do motor de execução.
 *
 * Os algoritmos não conversam com a interface: eles apenas emitem uma lista de
 * eventos (`SortEvent`). O motor transforma esses eventos em quadros (`Frame`),
 * e a visualização apenas interpreta os quadros.
 */

export type VarValue = number | string | boolean | null;

/** Vetor principal ou vetor auxiliar (usado pelo Merge Sort). */
export type Area = 'main' | 'aux';

/** Operando de uma comparação: uma posição de um vetor ou o valor "segurado" (chave). */
export type Operand = { area: Area; index: number } | { area: 'held' };

export type CompareOperator = '<' | '<=' | '>' | '>=';

export type RangeKind =
  | 'call' // subvetor da chamada recursiva atual
  | 'split' // divisão ao meio (Merge Sort)
  | 'merge' // duas metades sendo mescladas
  | 'partition' // resultado da partição (Quick Sort)
  | 'prefix' // parte já ordenada (Insertion Sort)
  | 'unsorted'; // região ainda não ordenada (Bubble/Selection)

export interface RangeMark {
  kind: RangeKind;
  lo: number;
  hi: number;
  /** Meio do subvetor (Merge Sort) ou posição final do pivô (partição). */
  mid?: number;
  label?: string;
}

export interface PointerTarget {
  area: Area;
  index: number;
}

/** Tom de um passo informativo, usado para escolher o rótulo de estado. */
export type NoteTone = 'info' | 'pointer' | 'phase' | 'base' | 'merged' | 'check' | 'skip' | 'heapify';

export type MetricKey =
  | 'comparisons'
  | 'swaps'
  | 'writes'
  | 'passes'
  | 'passComparisons'
  | 'calls'
  | 'partitions'
  | 'maxDepth'
  | 'merges'
  | 'shifts'
  | 'heapifies';

export type Metrics = Record<MetricKey, number>;

/**
 * Eventos de ação: cada um representa uma operação relevante do algoritmo e
 * gera exatamente um passo (quadro) na linha do tempo.
 */
export type ActionEvent =
  | {
      type: 'compare';
      left: Operand;
      right: Operand;
      operator: CompareOperator;
      values: [number, number];
      result: boolean;
    }
  | { type: 'swap'; indices: [number, number] }
  | { type: 'pivot'; index: number }
  | { type: 'sorted'; indices: number[] }
  | { type: 'lift'; index: number }
  | { type: 'shift'; from: number; to: number }
  | { type: 'drop'; index: number }
  | { type: 'copy-to-aux'; lo: number; hi: number }
  | { type: 'write-from-aux'; from: number; to: number }
  | { type: 'call'; id: number; parent: number | null; name: string; lo: number; hi: number }
  | { type: 'partition'; lo: number; pivot: number; hi: number }
  | { type: 'pass'; number: number }
  | { type: 'note'; tone: NoteTone }
  | { type: 'done' };

/**
 * Eventos modificadores: alteram o contexto (linha de código, variáveis,
 * ponteiros, explicação...) e são aplicados junto com a próxima ação.
 */
export type ModifierEvent =
  | { type: 'code-line'; line: number }
  | { type: 'vars'; vars: Record<string, VarValue | undefined> }
  | { type: 'pointers'; area: Area; pointers: Record<string, number | null> }
  | { type: 'range'; range: RangeMark | null }
  | { type: 'heap-size'; size: number | null }
  | { type: 'explain'; text: string; detail?: string }
  | { type: 'annotate'; text: string; tone: AnnotationTone }
  | { type: 'return'; id: number }
  | { type: 'metric'; name: MetricKey; delta: number };

export type SortEvent = ActionEvent | ModifierEvent;

export type ActionType = ActionEvent['type'];

export type AnnotationTone = 'true' | 'false' | 'info';

export interface Annotation {
  text: string;
  tone: AnnotationTone;
}

export interface HeldItem {
  /** Identificador do elemento segurado pelo mecanismo. */
  id: number;
  /** Posição (lacuna) sobre a qual o elemento está suspenso. */
  at: number;
}

/** Estado completo da visualização após um passo. */
export interface Frame {
  step: number;
  action: ActionEvent | { type: 'start' };
  /** Identificador do elemento em cada posição do vetor principal (null = lacuna). */
  main: readonly (number | null)[];
  /** Vetor auxiliar (apenas Merge Sort). */
  aux: readonly (number | null)[] | null;
  held: HeldItem | null;
  /** `sorted[id]` indica se o elemento já está na posição definitiva. */
  sorted: readonly boolean[];
  pivotId: number | null;
  range: RangeMark | null;
  heapSize: number | null;
  pointers: Readonly<Record<string, PointerTarget>>;
  vars: Readonly<Record<string, VarValue>>;
  line: number | null;
  annotation: Annotation | null;
  message: string;
  detail: string | null;
  metrics: Readonly<Metrics>;
  callStack: readonly number[];
}

export interface CallNode {
  id: number;
  parent: number | null;
  name: string;
  lo: number;
  hi: number;
  depth: number;
  startStep: number;
  /** Último passo executado dentro desta chamada. */
  endStep: number;
  children: number[];
  result: string | null;
  /** Passo em que o resultado (ex.: posição do pivô) foi obtido. */
  resultStep: number | null;
}

export interface Milestone {
  step: number;
  label: string;
}

export interface Trace {
  algorithm: string;
  input: readonly number[];
  output: readonly number[];
  events: readonly SortEvent[];
  frames: readonly Frame[];
  calls: readonly CallNode[];
  milestones: readonly Milestone[];
}

export function emptyMetrics(): Metrics {
  return {
    comparisons: 0,
    swaps: 0,
    writes: 0,
    passes: 0,
    passComparisons: 0,
    calls: 0,
    partitions: 0,
    maxDepth: 0,
    merges: 0,
    shifts: 0,
    heapifies: 0,
  };
}

export const ACTION_TYPES: ReadonlySet<string> = new Set<ActionType>([
  'compare',
  'swap',
  'pivot',
  'sorted',
  'lift',
  'shift',
  'drop',
  'copy-to-aux',
  'write-from-aux',
  'call',
  'partition',
  'pass',
  'note',
  'done',
]);

export function isAction(event: SortEvent): event is ActionEvent {
  return ACTION_TYPES.has(event.type);
}
