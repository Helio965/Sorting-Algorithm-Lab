import { defineCode } from '../engine/code';
import { ex } from '../engine/tracer';
import type { AlgorithmDefinition } from './types';

const code = defineCode(`
  function bubbleSort(a) {
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {          //@outer
      let swapped = false;
      for (let j = 0; j < n - i - 1; j++) {    //@inner
        if (a[j] > a[j + 1]) {                 //@compare
          swap(a, j, j + 1);                   //@swap
          swapped = true;
        }
      }
      // a[n - i - 1] está na posição final   //@settled
      if (!swapped) break;                     //@check
    }
  }
`);

export const bubbleSort: AlgorithmDefinition = {
  id: 'bubble',
  name: 'Bubble Sort',
  tagline: 'Ordenação por trocas entre vizinhos',
  description:
    'Percorre o vetor comparando apenas pares vizinhos. Sempre que um par está fora de ordem, os dois trocam de lugar. A cada passada, o maior valor restante "borbulha" até o fim.',
  steps: [
    'Compare o elemento atual com o vizinho da direita.',
    'Se o da esquerda for maior, troque os dois.',
    'Ao fim de uma passada, o maior valor está na posição final.',
    'Repita ignorando o fim já ordenado; pare se uma passada não fizer trocas.',
  ],
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  complexityNote:
    'Com o vetor já ordenado, uma única passada sem trocas encerra o algoritmo (O(n)). No caso geral, são até n−1 passadas de até n−1 comparações cada, o que cresce como n².',
  stable: true,
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
      const last = n - i - 1;
      t.at('outer')
        .vars({ i, j: undefined, swapped: false })
        .pointers({ j: null, 'j+1': null })
        .range({ kind: 'unsorted', lo: 0, hi: last, label: 'ainda não ordenado' })
        .explain(
          `Passada ${i + 1}: vamos percorrer as posições 0 a ${last}.`,
          `Comparando vizinhos, o maior valor desta região será empurrado para a direita, como uma bolha subindo, até chegar à posição ${last}.`,
        )
        .pass(i + 1);

      let swapped = false;
      for (let j = 0; j < last; j++) {
        t.at('inner').vars({ j }).pointers({ j, 'j+1': j + 1 });
        const outOfOrder = t.at('compare').compare(j, '>', j + 1, (x, y, r) =>
          r
            ? ex(`Estamos comparando ${x} e ${y}: ${x} > ${y}.`, `Troca necessária: o maior (${x}) precisa ficar à direita do menor (${y}).`)
            : ex(`Estamos comparando ${x} e ${y}: ${x} não é maior que ${y}.`, 'Este par já está em ordem, então nada muda. Seguimos para o próximo par.'),
        );
        if (outOfOrder) {
          const x = t.value(j);
          const y = t.value(j + 1);
          t.at('swap').explain(
            `Como ${x} é maior que ${y}, eles trocam de posição.`,
            `Agora o par ficou ${y} ${x}. Continuamos verificando os próximos elementos.`,
          );
          t.swap(j, j + 1);
          swapped = true;
          t.vars({ swapped: true });
        }
      }

      t.pointers({ j: null, 'j+1': null });
      t.at('settled').explain(
        `${t.value(last)} chegou à sua posição definitiva (${last}).`,
        `Ao fim da passada ${i + 1}, o maior valor ainda não ordenado está no fim. As próximas passadas não precisam mais olhar para ele — por isso o laço interno fica mais curto.`,
      );
      t.sorted(last);

      if (!swapped) {
        t.at('check').explain(
          'Nenhuma troca nesta passada: o vetor já está ordenado!',
          'Se uma passada inteira não troca nada, todos os vizinhos estão em ordem. O algoritmo para mais cedo — é isso que torna o melhor caso O(n).',
        );
        t.note('check');
        break;
      }
    }

    t.range(null);
    t.sortRemaining(
      'Os elementos restantes já estão em suas posições finais.',
      'Com os maiores valores fixados no fim, o que sobrou no início também está em ordem.',
    );
  },
};
