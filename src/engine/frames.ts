import {
  emptyMetrics,
  isAction,
  type ActionEvent,
  type Annotation,
  type CallNode,
  type Frame,
  type HeldItem,
  type Metrics,
  type Milestone,
  type PointerTarget,
  type RangeMark,
  type SortEvent,
  type VarValue,
} from './types';

export interface BuildResult {
  frames: Frame[];
  calls: CallNode[];
  milestones: Milestone[];
}

function fail(message: string): never {
  throw new Error(`Evento inconsistente: ${message}`);
}

/**
 * Reduz a lista de eventos em uma sequência de quadros.
 *
 * Cada evento de ação fecha um passo; os modificadores emitidos antes dele
 * (linha de código, ponteiros, explicação...) fazem parte desse mesmo passo.
 * Os quadros são imutáveis e compartilham estruturas que não mudaram.
 */
export function buildFrames(
  input: readonly number[],
  events: readonly SortEvent[],
  options: { usesAux?: boolean } = {},
): BuildResult {
  const n = input.length;
  const values = input;

  let main: (number | null)[] = input.map((_, i) => i);
  let aux: (number | null)[] | null = options.usesAux ? new Array<number | null>(n).fill(null) : null;
  let held: HeldItem | null = null;
  let sorted: boolean[] = new Array<boolean>(n).fill(false);
  let pivotId: number | null = null;
  let range: RangeMark | null = null;
  let heapSize: number | null = null;
  let pointers: Record<string, PointerTarget> = {};
  let vars: Record<string, VarValue> = {};
  let line: number | null = null;
  let annotation: Annotation | null = null;
  let explanation: { text: string; detail?: string } | null = null;
  let metrics: Metrics = emptyMetrics();
  let callStack: number[] = [];

  const calls: CallNode[] = [];
  const milestones: Milestone[] = [];
  const frames: Frame[] = [];

  const valueOf = (id: number | null | undefined): number => {
    if (id === null || id === undefined) fail('posição vazia');
    return values[id];
  };

  const push = (action: Frame['action'], fallback: string) => {
    frames.push({
      step: frames.length,
      action,
      main,
      aux,
      held,
      sorted,
      pivotId,
      range,
      heapSize,
      pointers,
      vars,
      line,
      annotation,
      message: explanation?.text ?? fallback,
      detail: explanation?.detail ?? null,
      metrics,
      callStack,
    });
    explanation = null;
    annotation = null;
  };

  const bump = (patch: Partial<Metrics>) => {
    metrics = { ...metrics };
    for (const [key, delta] of Object.entries(patch) as [keyof Metrics, number][]) {
      metrics[key] += delta;
    }
  };

  push({ type: 'start' }, 'Pronto! Clique em Iniciar ou avance passo a passo.');

  for (const event of events) {
    if (!isAction(event)) {
      switch (event.type) {
        case 'code-line':
          line = event.line;
          break;
        case 'vars': {
          const next = { ...vars };
          for (const [key, value] of Object.entries(event.vars)) {
            if (value === undefined) delete next[key];
            else next[key] = value;
          }
          vars = next;
          break;
        }
        case 'pointers': {
          const next = { ...pointers };
          for (const [key, index] of Object.entries(event.pointers)) {
            if (index === null) delete next[key];
            else next[key] = { area: event.area, index };
          }
          pointers = next;
          break;
        }
        case 'range':
          range = event.range;
          break;
        case 'heap-size':
          heapSize = event.size;
          break;
        case 'explain':
          explanation = { text: event.text, detail: event.detail };
          break;
        case 'annotate':
          annotation = { text: event.text, tone: event.tone };
          break;
        case 'return': {
          const top = callStack[callStack.length - 1];
          if (top !== event.id) fail(`retorno da chamada ${event.id}`);
          callStack = callStack.slice(0, -1);
          calls[event.id].endStep = frames.length - 1;
          break;
        }
        case 'metric':
          bump({ [event.name]: event.delta });
          break;
      }
      continue;
    }

    applyAction(event);
  }

  function applyAction(event: ActionEvent) {
    switch (event.type) {
      case 'compare': {
        bump({ comparisons: 1, passComparisons: 1 });
        const [l, r] = event.values;
        push(event, `Comparando ${l} e ${r}.`);
        return;
      }
      case 'swap': {
        const [i, j] = event.indices;
        const next = [...main];
        if (next[i] === null || next[j] === null) fail('troca com posição vazia');
        [next[i], next[j]] = [next[j], next[i]];
        main = next;
        bump({ swaps: 1, writes: 2 });
        push(event, `Trocando ${valueOf(main[j])} e ${valueOf(main[i])}.`);
        return;
      }
      case 'pivot':
        pivotId = main[event.index] ?? fail('pivô em posição vazia');
        push(event, `Pivô escolhido: ${valueOf(pivotId)}.`);
        return;
      case 'sorted': {
        const next = [...sorted];
        for (const index of event.indices) {
          next[main[index] ?? fail('posição vazia marcada como ordenada')] = true;
        }
        sorted = next;
        push(event, 'Elemento na posição definitiva.');
        return;
      }
      case 'lift': {
        if (held) fail('já existe um elemento segurado');
        const id = main[event.index] ?? fail('nada para levantar');
        held = { id, at: event.index };
        main = main.map((v, i) => (i === event.index ? null : v));
        push(event, `Segurando ${valueOf(id)}.`);
        return;
      }
      case 'shift': {
        const id = main[event.from] ?? fail('nada para deslocar');
        if (main[event.to] !== null) fail('deslocamento para posição ocupada');
        const next = [...main];
        next[event.to] = id;
        next[event.from] = null;
        main = next;
        if (held) held = { id: held.id, at: event.from };
        bump({ writes: 1, shifts: 1 });
        push(event, `${valueOf(id)} desloca para a posição ${event.to}.`);
        return;
      }
      case 'drop': {
        if (!held) fail('nada para soltar');
        if (main[event.index] !== null) fail('soltando em posição ocupada');
        const next = [...main];
        next[event.index] = held.id;
        main = next;
        const id = held.id;
        held = null;
        bump({ writes: 1 });
        push(event, `${valueOf(id)} inserido na posição ${event.index}.`);
        return;
      }
      case 'copy-to-aux': {
        if (!aux) fail('vetor auxiliar indisponível');
        const nextMain = [...main];
        const nextAux = [...aux];
        for (let k = event.lo; k <= event.hi; k++) {
          if (nextAux[k] !== null) fail('posição auxiliar ocupada');
          nextAux[k] = nextMain[k] ?? fail('cópia de posição vazia');
          nextMain[k] = null;
        }
        main = nextMain;
        aux = nextAux;
        bump({ writes: event.hi - event.lo + 1, merges: 1 });
        milestones.push({ step: frames.length, label: `Mescla [${event.lo}..${event.hi}]` });
        push(event, `Copiando [${event.lo}..${event.hi}] para o vetor auxiliar.`);
        return;
      }
      case 'write-from-aux': {
        if (!aux) fail('vetor auxiliar indisponível');
        const id = aux[event.from] ?? fail('leitura de posição auxiliar vazia');
        if (main[event.to] !== null) fail('escrita em posição ocupada');
        const nextMain = [...main];
        const nextAux = [...aux];
        nextMain[event.to] = id;
        nextAux[event.from] = null;
        main = nextMain;
        aux = nextAux;
        bump({ writes: 1 });
        push(event, `${valueOf(id)} volta para a posição ${event.to}.`);
        return;
      }
      case 'call': {
        callStack = [...callStack, event.id];
        bump({ calls: 1 });
        if (callStack.length > metrics.maxDepth) {
          metrics = { ...metrics, maxDepth: callStack.length };
        }
        const node: CallNode = {
          id: event.id,
          parent: event.parent,
          name: event.name,
          lo: event.lo,
          hi: event.hi,
          depth: callStack.length - 1,
          startStep: frames.length,
          endStep: frames.length,
          children: [],
          result: null,
          resultStep: null,
        };
        if (calls.length !== event.id) fail('identificadores de chamada fora de ordem');
        calls.push(node);
        if (event.parent !== null) calls[event.parent].children.push(event.id);
        push(event, `Chamada ${event.name}.`);
        return;
      }
      case 'partition': {
        bump({ partitions: 1 });
        const pivotValue = valueOf(main[event.pivot]);
        pivotId = null;
        const top = callStack[callStack.length - 1];
        if (top !== undefined) {
          calls[top].result = `pivô ${pivotValue} → posição ${event.pivot}`;
          calls[top].resultStep = frames.length;
        }
        milestones.push({ step: frames.length, label: `Partição (pivô ${pivotValue})` });
        push(event, `Partição concluída em torno do pivô ${pivotValue}.`);
        return;
      }
      case 'pass':
        metrics = { ...metrics, passes: event.number, passComparisons: 0 };
        milestones.push({ step: frames.length, label: `Passada ${event.number}` });
        push(event, `Passada ${event.number}.`);
        return;
      case 'note':
        if (event.tone === 'phase') {
          milestones.push({ step: frames.length, label: explanation?.text ?? 'Nova fase' });
        }
        push(event, 'Continuando.');
        return;
      case 'done':
        sorted = new Array<boolean>(n).fill(true);
        pivotId = null;
        range = null;
        pointers = {};
        line = null;
        milestones.push({ step: frames.length, label: 'Concluído' });
        explanation = explanation ?? {
          text: 'Pronto! O vetor está completamente ordenado.',
          detail: 'Todos os elementos estão em suas posições definitivas. Confira as métricas para ver quanto trabalho foi necessário.',
        };
        push(event, 'Ordenação concluída.');
        return;
    }
  }

  return { frames, calls, milestones };
}

/** Valores do vetor principal em um quadro (lacunas como null). */
export function frameValues(frame: Frame, input: readonly number[]): (number | null)[] {
  return frame.main.map((id) => (id === null ? null : input[id]));
}
