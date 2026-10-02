import type { CodeListing } from './code';
import type {
  Area,
  CompareOperator,
  MetricKey,
  NoteTone,
  Operand,
  RangeMark,
  SortEvent,
  VarValue,
} from './types';

export interface Explanation {
  text: string;
  detail?: string;
}

/** Atalho para montar uma explicação. */
export function ex(text: string, detail?: string): Explanation {
  return { text, detail };
}

/** Índice do vetor principal ou um operando explícito. */
export type OperandInput = number | Operand;

/** Operando que referencia o vetor auxiliar. */
export function aux(index: number): Operand {
  return { area: 'aux', index };
}

/** Operando que referencia o elemento segurado pelo mecanismo (chave). */
export const HELD: Operand = { area: 'held' };

function evaluate(left: number, operator: CompareOperator, right: number): boolean {
  switch (operator) {
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    case '>=':
      return left >= right;
  }
}

function toOperand(input: OperandInput): Operand {
  return typeof input === 'number' ? { area: 'main', index: input } : input;
}

/**
 * Gravador instrumentado.
 *
 * O algoritmo executa de verdade sobre os valores guardados aqui: toda
 * leitura, comparação e movimentação passa pelo Tracer, que aplica a operação
 * e registra o evento correspondente. Assim as métricas e a animação são
 * consequência direta da execução real — nada é simulado.
 */
export class Tracer {
  readonly events: SortEvent[] = [];
  private readonly a: (number | null)[];
  private readonly auxValues: (number | null)[];
  private heldValue: number | null = null;
  private readonly sortedIdx: boolean[];
  private nextCallId = 0;
  private readonly stack: number[] = [];

  constructor(
    input: readonly number[],
    private readonly code: CodeListing,
  ) {
    this.a = [...input];
    this.auxValues = new Array<number | null>(input.length).fill(null);
    this.sortedIdx = new Array<boolean>(input.length).fill(false);
  }

  get length(): number {
    return this.a.length;
  }

  /** Lê um valor do vetor principal (leituras não contam como comparação). */
  value(index: number): number {
    this.checkIndex(index);
    const v = this.a[index];
    if (v === null) throw new Error(`Posição ${index} está vazia`);
    return v;
  }

  auxValue(index: number): number {
    this.checkIndex(index);
    const v = this.auxValues[index];
    if (v === null) throw new Error(`Posição auxiliar ${index} está vazia`);
    return v;
  }

  get held(): number {
    if (this.heldValue === null) throw new Error('Nenhum elemento está sendo segurado');
    return this.heldValue;
  }

  read(operand: OperandInput): number {
    const op = toOperand(operand);
    if (op.area === 'held') return this.held;
    return op.area === 'main' ? this.value(op.index) : this.auxValue(op.index);
  }

  isSorted(index: number): boolean {
    return this.sortedIdx[index];
  }

  /** Estado final do vetor principal. */
  result(): number[] {
    return this.a.map((v, i) => {
      if (v === null) throw new Error(`Posição ${i} terminou vazia`);
      return v;
    });
  }

  // ---------------------------------------------------------------- contexto

  /** Destaca uma linha do código pelo rótulo. */
  at(label: string): this {
    const line = this.code.labels[label];
    if (line === undefined) throw new Error(`Rótulo de código desconhecido: ${label}`);
    this.events.push({ type: 'code-line', line });
    return this;
  }

  /** Atualiza variáveis exibidas (`undefined` remove a variável). */
  vars(vars: Record<string, VarValue | undefined>): this {
    this.events.push({ type: 'vars', vars });
    return this;
  }

  /** Posiciona ponteiros (`null` remove o ponteiro). */
  pointers(pointers: Record<string, number | null>, area: Area = 'main'): this {
    this.events.push({ type: 'pointers', area, pointers });
    return this;
  }

  range(range: RangeMark | null): this {
    this.events.push({ type: 'range', range });
    return this;
  }

  heapSize(size: number | null): this {
    this.events.push({ type: 'heap-size', size });
    return this;
  }

  explain(text: string, detail?: string): this {
    this.events.push({ type: 'explain', text, detail });
    return this;
  }

  count(name: MetricKey, delta = 1): this {
    this.events.push({ type: 'metric', name, delta });
    return this;
  }

  // ------------------------------------------------------------------ ações

  /** Compara dois operandos executando a comparação real e registra o passo. */
  compare(
    left: OperandInput,
    operator: CompareOperator,
    right: OperandInput,
    explain?: (left: number, right: number, result: boolean) => Explanation,
  ): boolean {
    const l = this.read(left);
    const r = this.read(right);
    const result = evaluate(l, operator, r);
    if (explain) {
      const e = explain(l, r, result);
      this.explain(e.text, e.detail);
    }
    this.events.push({
      type: 'annotate',
      text: `${l} ${operator} ${r}`,
      tone: result ? 'true' : 'false',
    });
    this.events.push({
      type: 'compare',
      left: toOperand(left),
      right: toOperand(right),
      operator,
      values: [l, r],
      result,
    });
    return result;
  }

  swap(i: number, j: number): void {
    const vi = this.value(i);
    const vj = this.value(j);
    if (i === j) throw new Error('Troca de um elemento com ele mesmo');
    this.a[i] = vj;
    this.a[j] = vi;
    this.events.push({ type: 'annotate', text: `${vi} ⇄ ${vj}`, tone: 'info' });
    this.events.push({ type: 'swap', indices: [i, j] });
  }

  pivot(index: number): void {
    this.value(index);
    this.events.push({ type: 'pivot', index });
  }

  sorted(...indices: number[]): void {
    for (const i of indices) {
      this.value(i);
      this.sortedIdx[i] = true;
    }
    this.events.push({ type: 'sorted', indices });
  }

  /** Marca como ordenadas todas as posições ainda não marcadas (se houver). */
  sortRemaining(text: string, detail?: string): void {
    const rest = this.sortedIdx.flatMap((done, i) => (done ? [] : [i]));
    if (rest.length === 0) return;
    this.explain(text, detail);
    this.sorted(...rest);
  }

  /** Retira um elemento do vetor, deixando uma lacuna (Insertion Sort). */
  lift(index: number): number {
    if (this.heldValue !== null) throw new Error('Já existe um elemento segurado');
    const v = this.value(index);
    this.heldValue = v;
    this.a[index] = null;
    this.events.push({ type: 'lift', index });
    return v;
  }

  /** Desloca um elemento para uma lacuna. */
  shift(from: number, to: number): void {
    const v = this.value(from);
    this.checkIndex(to);
    if (this.a[to] !== null) throw new Error(`Posição ${to} não está vazia`);
    this.a[to] = v;
    this.a[from] = null;
    this.events.push({ type: 'shift', from, to });
  }

  /** Coloca o elemento segurado em uma lacuna. */
  drop(index: number): void {
    const v = this.held;
    this.checkIndex(index);
    if (this.a[index] !== null) throw new Error(`Posição ${index} não está vazia`);
    this.a[index] = v;
    this.heldValue = null;
    this.events.push({ type: 'drop', index });
  }

  /** Copia (move) a[lo..hi] para o vetor auxiliar. */
  copyToAux(lo: number, hi: number): void {
    for (let k = lo; k <= hi; k++) {
      const v = this.value(k);
      if (this.auxValues[k] !== null) throw new Error(`Posição auxiliar ${k} ocupada`);
      this.auxValues[k] = v;
      this.a[k] = null;
    }
    this.events.push({ type: 'copy-to-aux', lo, hi });
  }

  /** Escreve aux[from] em a[to]. */
  writeFromAux(from: number, to: number): void {
    const v = this.auxValue(from);
    this.checkIndex(to);
    if (this.a[to] !== null) throw new Error(`Posição ${to} não está vazia`);
    this.a[to] = v;
    this.auxValues[from] = null;
    this.events.push({ type: 'write-from-aux', from, to });
  }

  /** Registra o início de uma chamada recursiva e devolve seu identificador. */
  call(name: string, lo: number, hi: number): number {
    const id = this.nextCallId++;
    const parent = this.stack.length ? this.stack[this.stack.length - 1] : null;
    this.events.push({ type: 'call', id, parent, name, lo, hi });
    this.stack.push(id);
    return id;
  }

  /** Registra o fim de uma chamada recursiva. */
  ret(id: number): void {
    const top = this.stack.pop();
    if (top !== id) throw new Error(`Retorno inesperado da chamada ${id}`);
    this.events.push({ type: 'return', id });
  }

  partition(lo: number, pivot: number, hi: number): void {
    this.events.push({ type: 'partition', lo, pivot, hi });
  }

  pass(number: number): void {
    this.events.push({ type: 'pass', number });
  }

  note(tone: NoteTone = 'info'): void {
    this.events.push({ type: 'note', tone });
  }

  /** Finaliza a execução validando que o estado é consistente. */
  finish(): number[] {
    if (this.heldValue !== null) throw new Error('Execução terminou segurando um elemento');
    if (this.stack.length) throw new Error('Execução terminou com chamadas abertas');
    if (this.auxValues.some((v) => v !== null)) throw new Error('Vetor auxiliar não foi esvaziado');
    const output = this.result();
    this.events.push({ type: 'done' });
    return output;
  }

  private checkIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.a.length) {
      throw new Error(`Índice fora do vetor: ${index}`);
    }
  }
}
