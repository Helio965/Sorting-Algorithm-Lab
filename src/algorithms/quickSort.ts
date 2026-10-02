import { defineCode } from '../engine/code';
import { ex, type Tracer } from '../engine/tracer';
import type { AlgorithmDefinition } from './types';

const code = defineCode(`
  function quickSort(a, lo = 0, hi = a.length - 1) {  //@call
    if (lo >= hi) return;                             //@base
    const p = partition(a, lo, hi);
    quickSort(a, lo, p - 1);                          //@left
    quickSort(a, p + 1, hi);                          //@right
  }

  function partition(a, lo, hi) {
    const pivot = a[hi];                              //@pivot
    let i = lo;
    for (let j = lo; j < hi; j++) {
      if (a[j] < pivot) {                             //@compare
        if (i !== j) swap(a, i, j);                   //@swap
        i++;                                          //@advance
      }
    }
    if (i !== hi) swap(a, i, hi);                     //@place
    return i;                                         //@return
  }
`);

function describe(t: Tracer, lo: number, hi: number): string {
  const parts: number[] = [];
  for (let k = lo; k <= hi; k++) parts.push(t.value(k));
  return parts.length ? `[${parts.join(' ')}]` : '[ ]';
}

function partition(t: Tracer, lo: number, hi: number): number {
  const pivot = t.value(hi);
  t.at('pivot')
    .vars({ pivot, i: lo, j: undefined })
    .pointers({ i: lo, j: null })
    .explain(
      `O número ${pivot} foi escolhido como pivô.`,
      'Usamos o último elemento do subvetor (partição de Lomuto). Os valores menores que o pivô serão posicionados à esquerda; os demais ficam à direita.',
    );
  t.pivot(hi);

  let i = lo;
  for (let j = lo; j < hi; j++) {
    t.vars({ j }).pointers({ j });
    const less = t.at('compare').compare(j, '<', hi, (x, p, r) =>
      r
        ? ex(`Comparando ${x} com o pivô ${p}: ${x} < ${p}.`, `${x} é menor que o pivô, então pertence à parte esquerda (posição i = ${i}).`)
        : ex(`Comparando ${x} com o pivô ${p}: ${x} não é menor.`, `${x} fica na parte direita. Apenas j avança.`),
    );
    if (less) {
      if (i !== j) {
        const a = t.value(i);
        const b = t.value(j);
        t.at('swap').explain(
          `Trocamos ${a} e ${b}.`,
          `${b} vai para a posição i = ${i}, ampliando a região dos menores que o pivô; ${a} vai para a posição ${j}.`,
        );
        t.swap(i, j);
      }
      i++;
      t.at('advance')
        .vars({ i })
        .pointers({ i })
        .explain(
          `O ponteiro i avança para ${i}.`,
          i - 1 > lo
            ? `As posições ${lo} a ${i - 1} contêm apenas valores menores que o pivô.`
            : `A posição ${lo} já contém um valor menor que o pivô.`,
        )
        .note('pointer');
    }
  }

  t.pointers({ j: null }).vars({ j: undefined });
  if (i !== hi) {
    const a = t.value(i);
    t.at('place').explain(
      `Colocamos o pivô ${pivot} na posição ${i}.`,
      `Trocamos o pivô com ${a}, o primeiro elemento da parte direita. Assim ele fica entre os menores e os maiores.`,
    );
    t.swap(i, hi);
  }
  t.at('return').explain(
    `O pivô ${pivot} está na posição definitiva ${i}.`,
    'Todos à esquerda são menores e todos à direita são maiores ou iguais: ele nunca mais vai se mover.',
  );
  t.sorted(i);

  t.range({ kind: 'partition', lo, hi, mid: i })
    .explain(
      `Partição concluída: ${describe(t, lo, i - 1)} | ${pivot} | ${describe(t, i + 1, hi)}`,
      'Agora cada lado é ordenado separadamente, com chamadas recursivas.',
    );
  t.partition(lo, i, hi);
  return i;
}

function quick(t: Tracer, lo: number, hi: number, site: 'call' | 'left' | 'right'): void {
  const name = `quickSort(${lo}, ${hi})`;
  t.at(site)
    .vars({ lo, hi, pivot: undefined, i: undefined, j: undefined })
    .pointers({ lo: lo <= hi ? lo : null, hi: lo <= hi ? hi : null, i: null, j: null })
    .range(lo <= hi ? { kind: 'call', lo, hi, label: `subvetor [${lo}..${hi}]` } : null)
    .explain(
      `Chamada ${name}.`,
      site === 'call'
        ? 'Começamos com o vetor inteiro.'
        : site === 'left'
          ? 'Ordenamos agora a parte da esquerda (menores que o pivô).'
          : 'Ordenamos agora a parte da direita (maiores ou iguais ao pivô).',
    );
  const id = t.call(name, lo, hi);

  if (lo >= hi) {
    t.at('base');
    if (lo === hi) {
      t.explain(
        `O subvetor [${lo}..${hi}] tem um único elemento (${t.value(lo)}).`,
        'Um elemento sozinho já está ordenado: ele está na posição definitiva.',
      );
      t.sorted(lo);
    } else {
      t.explain('Subvetor vazio: não há nada para ordenar.', 'Caso base da recursão: a chamada termina imediatamente.').note('base');
    }
    t.ret(id);
    return;
  }

  const p = partition(t, lo, hi);
  quick(t, lo, p - 1, 'left');
  quick(t, p + 1, hi, 'right');
  t.ret(id);
}

export const quickSort: AlgorithmDefinition = {
  id: 'quick',
  name: 'Quick Sort',
  tagline: 'Dividir e conquistar com partição de Lomuto',
  description:
    'Escolhe um pivô e reorganiza o subvetor para que os menores fiquem à esquerda e os maiores à direita. O pivô chega à posição definitiva e cada lado é ordenado recursivamente.',
  steps: [
    'Escolha o último elemento do subvetor como pivô.',
    'Percorra com j; quando a[j] < pivô, troque-o para a posição i e avance i.',
    'Coloque o pivô na posição i: ela é definitiva.',
    'Ordene recursivamente a parte esquerda e a parte direita.',
  ],
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)' },
  complexityNote:
    'Quando o pivô divide o vetor em partes equilibradas, há cerca de log n níveis de recursão com n comparações cada. Com o último elemento como pivô, um vetor já ordenado ou invertido gera partições desequilibradas e o custo vira n². A memória extra vem da pilha de recursão.',
  stable: false,
  inPlace: true,
  usesAux: false,
  recursive: true,
  extraMetrics: [
    { key: 'calls', label: 'Recursões', hint: 'Chamadas de quickSort' },
    { key: 'partitions', label: 'Partições', hint: 'Partições concluídas' },
    { key: 'maxDepth', label: 'Profundidade máx.', hint: 'Maior profundidade da pilha de recursão' },
  ],
  code,
  run(t) {
    t.vars({ n: t.length });
    if (t.length > 0) quick(t, 0, t.length - 1, 'call');
    t.range(null);
    t.sortRemaining('Todas as partições terminaram.', 'Cada elemento foi pivô ou ficou sozinho em um subvetor.');
  },
};
