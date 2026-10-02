import { defineCode } from '../engine/code';
import { ex } from '../engine/tracer';
import type { AlgorithmDefinition } from './types';

const code = defineCode(`
  function selectionSort(a) {
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {        //@outer
      let min = i;                           //@init
      for (let j = i + 1; j < n; j++) {
        if (a[j] < a[min]) {                 //@compare
          min = j;                           //@new-min
        }
      }
      if (min !== i) {                       //@check
        swap(a, i, min);                     //@swap
      }
      // a[i] está na posição final         //@settled
    }
  }
`);

export const selectionSort: AlgorithmDefinition = {
  id: 'selection',
  name: 'Selection Sort',
  tagline: 'Ordenação por seleção do menor',
  description:
    'A cada passada, procura o menor valor da parte ainda não ordenada e o coloca no início dessa parte com uma única troca. A parte ordenada cresce da esquerda para a direita.',
  steps: [
    'Suponha que o primeiro elemento não ordenado é o menor.',
    'Percorra o restante procurando um valor ainda menor.',
    'Troque o menor encontrado com a primeira posição não ordenada.',
    'Avance uma posição e repita.',
  ],
  complexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  complexityNote:
    'Mesmo com o vetor já ordenado, ele precisa olhar todos os elementos restantes para ter certeza de qual é o menor: sempre n(n−1)/2 comparações. Em compensação, faz no máximo n−1 trocas.',
  stable: false,
  inPlace: true,
  usesAux: false,
  recursive: false,
  extraMetrics: [
    { key: 'passes', label: 'Passadas', hint: 'Número da passada atual' },
    { key: 'passComparisons', label: 'Comparações na passada', hint: 'Comparações feitas na passada atual' },
  ],
  code,
  run(t) {
    const n = t.length;
    t.vars({ n });

    for (let i = 0; i < n - 1; i++) {
      t.at('outer')
        .vars({ i, min: undefined, j: undefined })
        .pointers({ i, min: null, j: null })
        .range({ kind: 'unsorted', lo: i, hi: n - 1, label: 'busca do menor' })
        .explain(
          `Passada ${i + 1}: procurar o menor valor entre as posições ${i} e ${n - 1}.`,
          `O menor valor encontrado será colocado na posição ${i}.`,
        )
        .pass(i + 1);

      let min = i;
      t.at('init')
        .vars({ min })
        .pointers({ min })
        .explain(
          `Começamos supondo que o menor é ${t.value(i)} (posição ${i}).`,
          'Vamos comparar com cada elemento à direita; se acharmos um valor menor, ele vira o novo mínimo.',
        )
        .note('pointer');

      for (let j = i + 1; j < n; j++) {
        t.vars({ j }).pointers({ j });
        const smaller = t.at('compare').compare(j, '<', min, (x, m, r) =>
          r
            ? ex(`Comparando ${x} com o menor atual (${m}): ${x} é menor!`, `${x} < ${m}, então ${x} passa a ser o novo menor.`)
            : ex(`Comparando ${x} com o menor atual (${m}).`, `${x} não é menor que ${m}: o mínimo continua o mesmo.`),
        );
        if (smaller) {
          min = j;
          t.at('new-min')
            .vars({ min })
            .pointers({ min })
            .explain(`Novo menor encontrado: ${t.value(j)} na posição ${j}.`, 'O ponteiro "min" agora aponta para ele.')
            .note('pointer');
        }
      }

      t.pointers({ j: null }).vars({ j: undefined });
      if (min !== i) {
        const a = t.value(i);
        const m = t.value(min);
        t.at('swap').explain(
          `Trocamos ${a} com ${m}.`,
          `O menor valor da passada (${m}) vai para a posição ${i}; ${a} vai para onde estava o mínimo.`,
        );
        t.swap(i, min);
      } else {
        t.at('check')
          .explain(`${t.value(i)} já é o menor: não precisa trocar.`, 'Quando o mínimo já está na posição certa, a troca é pulada.')
          .note('skip');
      }

      t.pointers({ min: null }).at('settled');
      t.explain(
        `${t.value(i)} está na posição definitiva ${i}.`,
        `Tudo à esquerda da posição ${i + 1} já está ordenado e não será mais tocado.`,
      );
      t.sorted(i);
    }

    t.range(null).pointers({ i: null });
    t.sortRemaining(
      'O último elemento já está no lugar certo.',
      'Depois de posicionar os n−1 menores, o que sobrou só pode ser o maior.',
    );
  },
};
