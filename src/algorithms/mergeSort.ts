import { defineCode } from '../engine/code';
import { aux, ex, type Tracer } from '../engine/tracer';
import type { AlgorithmDefinition } from './types';

const code = defineCode(`
  const aux = [];  // vetor auxiliar

  function mergeSort(a, lo = 0, hi = a.length - 1) {  //@call
    if (lo >= hi) return;                             //@base
    const mid = Math.floor((lo + hi) / 2);            //@mid
    mergeSort(a, lo, mid);                            //@left
    mergeSort(a, mid + 1, hi);                        //@right
    merge(a, lo, mid, hi);                            //@merge
  }

  function merge(a, lo, mid, hi) {
    for (let k = lo; k <= hi; k++) aux[k] = a[k];     //@copy
    let i = lo, j = mid + 1;
    for (let k = lo; k <= hi; k++) {
      if (i > mid) a[k] = aux[j++];                   //@right-rest
      else if (j > hi) a[k] = aux[i++];               //@left-rest
      else if (aux[j] < aux[i]) a[k] = aux[j++];      //@compare @take-right
      else a[k] = aux[i++];                           //@take-left
    }
  }
`);

function merge(t: Tracer, lo: number, mid: number, hi: number): void {
  t.at('copy')
    .vars({ lo, mid, hi, i: undefined, j: undefined, k: undefined })
    .pointers({ lo: null, hi: null, mid: null })
    .range({ kind: 'merge', lo, hi, mid, label: `mesclando [${lo}..${mid}] + [${mid + 1}..${hi}]` })
    .explain(
      `Copiamos as posições ${lo} a ${hi} para o vetor auxiliar.`,
      `As metades [${lo}..${mid}] e [${mid + 1}..${hi}] já estão ordenadas. Agora vamos intercalá-las de volta no vetor principal, sempre escolhendo o menor da frente de cada metade.`,
    );
  t.copyToAux(lo, hi);

  let i = lo;
  let j = mid + 1;
  for (let k = lo; k <= hi; k++) {
    t.vars({ i, j, k })
      .pointers({ i: i <= mid ? i : null, j: j <= hi ? j : null }, 'aux')
      .pointers({ k });

    if (i > mid) {
      const v = t.auxValue(j);
      t.at('right-rest').explain(
        `A metade esquerda acabou: ${v} vai direto para a posição ${k}.`,
        'Como só restam elementos da direita (e eles já estão em ordem), basta copiá-los.',
      );
      t.writeFromAux(j, k);
      j++;
    } else if (j > hi) {
      const v = t.auxValue(i);
      t.at('left-rest').explain(
        `A metade direita acabou: ${v} vai direto para a posição ${k}.`,
        'Só restam elementos da esquerda, já em ordem: basta copiá-los.',
      );
      t.writeFromAux(i, k);
      i++;
    } else {
      const rightSmaller = t.at('compare').compare(aux(j), '<', aux(i), (r, l, res) =>
        res
          ? ex(`Comparando ${l} (esquerda) com ${r} (direita): ${r} é menor.`, `${r} < ${l}, então o ${r} vem primeiro.`)
          : ex(
              `Comparando ${l} (esquerda) com ${r} (direita): ${l} vem primeiro.`,
              r === l
                ? `Os valores são iguais: pegamos o da esquerda para manter a ordem original (estabilidade).`
                : `${r} não é menor que ${l}, então o ${l} vem primeiro.`,
            ),
      );
      if (rightSmaller) {
        const v = t.auxValue(j);
        t.at('take-right').explain(`${v} volta para o vetor na posição ${k}.`, 'O ponteiro j avança na metade direita.');
        t.writeFromAux(j, k);
        j++;
      } else {
        const v = t.auxValue(i);
        t.at('take-left').explain(`${v} volta para o vetor na posição ${k}.`, 'O ponteiro i avança na metade esquerda.');
        t.writeFromAux(i, k);
        i++;
      }
    }
  }

  t.pointers({ i: null, j: null }, 'aux').pointers({ k: null }).vars({ i: undefined, j: undefined, k: undefined });
  const merged: number[] = [];
  for (let k = lo; k <= hi; k++) merged.push(t.value(k));
  t.range({ kind: 'call', lo, hi, label: `ordenado [${lo}..${hi}]` });
  const full = lo === 0 && hi === t.length - 1;
  t.explain(
    `Mescla concluída: [${merged.join(' ')}].`,
    full
      ? 'Esta foi a última mescla: o vetor inteiro está ordenado.'
      : `O subvetor [${lo}..${hi}] agora está ordenado e poderá ser mesclado com o vizinho.`,
  );
  if (full) t.sorted(...merged.map((_, idx) => lo + idx));
  else t.note('merged');
}

function sortRange(t: Tracer, lo: number, hi: number, site: 'call' | 'left' | 'right'): void {
  const name = `mergeSort(${lo}, ${hi})`;
  t.at(site)
    .vars({ lo, hi, mid: undefined })
    .pointers({ lo, hi, mid: null })
    .range({ kind: 'call', lo, hi, label: `subvetor [${lo}..${hi}]` })
    .explain(
      `Chamada ${name}.`,
      site === 'call'
        ? 'Começamos com o vetor inteiro.'
        : site === 'left'
          ? 'Primeiro ordenamos a metade da esquerda.'
          : 'Depois ordenamos a metade da direita.',
    );
  const id = t.call(name, lo, hi);

  if (lo >= hi) {
    t.at('base').explain(
      `Um único elemento (${t.value(lo)}) já está ordenado.`,
      'Caso base: não dá para dividir mais. A recursão volta para mesclar.',
    );
    t.note('base');
    t.ret(id);
    return;
  }

  const mid = Math.floor((lo + hi) / 2);
  t.at('mid')
    .vars({ mid })
    .pointers({ mid })
    .range({ kind: 'split', lo, hi, mid, label: `dividir [${lo}..${hi}]` })
    .explain(
      `Dividimos ao meio: [${lo}..${mid}] e [${mid + 1}..${hi}].`,
      'Cada metade será ordenada separadamente; depois as duas são intercaladas.',
    )
    .note('phase');

  sortRange(t, lo, mid, 'left');
  sortRange(t, mid + 1, hi, 'right');
  t.at('merge').vars({ lo, mid, hi });
  merge(t, lo, mid, hi);
  t.ret(id);
}

export const mergeSort: AlgorithmDefinition = {
  id: 'merge',
  name: 'Merge Sort',
  tagline: 'Dividir e conquistar com intercalação',
  description:
    'Divide o vetor ao meio repetidamente até sobrarem elementos isolados. Depois intercala (mescla) as metades ordenadas usando um vetor auxiliar, sempre pegando o menor da frente de cada metade.',
  steps: [
    'Divida o subvetor em duas metades.',
    'Ordene cada metade recursivamente.',
    'Copie o subvetor para o vetor auxiliar.',
    'Intercale as metades de volta, escolhendo sempre o menor.',
  ],
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)' },
  complexityNote:
    'O vetor é dividido ao meio cerca de log₂ n vezes e, em cada nível, a mescla percorre todos os n elementos. Esse custo não depende da ordem inicial. O preço é o vetor auxiliar de tamanho n.',
  stable: true,
  inPlace: false,
  usesAux: true,
  recursive: true,
  extraMetrics: [
    { key: 'calls', label: 'Recursões', hint: 'Chamadas de mergeSort' },
    { key: 'merges', label: 'Mesclas', hint: 'Intercalações realizadas' },
    { key: 'maxDepth', label: 'Profundidade máx.', hint: 'Maior profundidade da pilha de recursão' },
  ],
  code,
  run(t) {
    t.vars({ n: t.length });
    if (t.length > 0) sortRange(t, 0, t.length - 1, 'call');
    t.range(null).pointers({ lo: null, hi: null, mid: null });
    t.sortRemaining('Todas as mesclas terminaram.', 'O vetor está ordenado.');
  },
};
