import { defineCode } from '../engine/code';
import { ex, HELD } from '../engine/tracer';
import type { AlgorithmDefinition } from './types';

const code = defineCode(`
  function insertionSort(a) {
    for (let i = 1; i < a.length; i++) {      //@outer
      const key = a[i];                       //@key
      let j = i - 1;
      while (j >= 0 && a[j] > key) {          //@loop
        a[j + 1] = a[j];                      //@shift
        j--;
      }
      a[j + 1] = key;                         //@insert
    }
  }
`);

export const insertionSort: AlgorithmDefinition = {
  id: 'insertion',
  name: 'Insertion Sort',
  tagline: 'Ordenação por inserção',
  description:
    'Funciona como organizar cartas na mão: pega o próximo elemento (a "chave"), desloca para a direita os maiores que ela e a insere no espaço aberto. A parte da esquerda está sempre ordenada.',
  steps: [
    'Pegue o próximo elemento: ele é a chave.',
    'Compare a chave com os elementos à esquerda.',
    'Desloque uma posição para a direita cada elemento maior que a chave.',
    'Insira a chave na lacuna que sobrou.',
  ],
  complexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)', space: 'O(1)' },
  complexityNote:
    'Se o vetor já está ordenado, cada chave é comparada uma única vez (O(n)). No pior caso (vetor invertido), cada chave percorre toda a parte ordenada, somando cerca de n²/2 deslocamentos.',
  stable: true,
  inPlace: true,
  usesAux: false,
  recursive: false,
  extraMetrics: [
    { key: 'shifts', label: 'Deslocamentos', hint: 'Elementos movidos uma posição para a direita' },
    { key: 'passes', label: 'Chave atual', hint: 'Quantas chaves já foram pegas' },
  ],
  code,
  run(t) {
    const n = t.length;
    t.vars({ n });

    if (n > 1) {
      t.range({ kind: 'prefix', lo: 0, hi: 0, label: 'parte ordenada' });
    }

    for (let i = 1; i < n; i++) {
      t.at('outer').vars({ i, key: undefined, j: undefined }).pointers({ i, j: null }).count('passes');
      const key = t.value(i);
      t.at('key')
        .vars({ key })
        .explain(
          `Pegamos o ${key}: ele é a chave desta rodada.`,
          `A parte à esquerda (posições 0 a ${i - 1}) já está ordenada. Vamos encontrar o lugar certo do ${key} dentro dela.`,
        );
      t.lift(i);

      let j = i - 1;
      t.vars({ j }).pointers({ j });
      for (;;) {
        if (j < 0) {
          t.at('loop')
            .explain('Chegamos ao início do vetor.', `Não há mais elementos à esquerda: ${key} é o menor até agora e vai para a posição 0.`)
            .note('check');
          break;
        }
        const greater = t.at('loop').compare(j, '>', HELD, (x, k, r) =>
          r
            ? ex(`${x} é maior que a chave ${k}.`, `Como ${x} > ${k}, o ${x} precisa deslocar uma posição para a direita para abrir espaço.`)
            : ex(`${x} não é maior que a chave ${k}.`, `Encontramos o lugar da chave: logo depois do ${x}.`),
        );
        if (!greater) break;
        const v = t.value(j);
        t.at('shift').explain(`${v} desloca para a posição ${j + 1}.`, `A lacuna agora fica na posição ${j}.`);
        t.shift(j, j + 1);
        j--;
        t.vars({ j }).pointers({ j: j >= 0 ? j : null });
      }

      t.pointers({ j: null }).range({ kind: 'prefix', lo: 0, hi: i, label: 'parte ordenada' });
      t.at('insert').explain(
        `Inserimos a chave ${key} na posição ${j + 1}.`,
        `Agora as posições 0 a ${i} estão ordenadas entre si.`,
      );
      t.drop(j + 1);
    }

    t.range(null).pointers({ i: null });
    t.sortRemaining(
      'Todas as chaves foram inseridas: o vetor está ordenado.',
      'A parte ordenada cresceu até ocupar o vetor inteiro.',
    );
  },
};
