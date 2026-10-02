import { defineCode } from '../engine/code';
import { ex, type Tracer } from '../engine/tracer';
import type { AlgorithmDefinition } from './types';

const code = defineCode(`
  function heapSort(a) {
    const n = a.length;
    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {   //@build
      siftDown(a, i, n);                                 //@build-sift
    }
    for (let end = n - 1; end > 0; end--) {              //@extract-loop
      swap(a, 0, end);                                   //@extract
      siftDown(a, 0, end);                               //@extract-sift
    }
  }

  function siftDown(a, root, size) {
    while (2 * root + 1 < size) {                        //@sift-loop
      let child = 2 * root + 1;
      if (child + 1 < size && a[child + 1] > a[child]) { //@compare-children
        child++;                                         //@right-child
      }
      if (a[root] >= a[child]) return;                   //@compare-root
      swap(a, root, child);                              //@swap
      root = child;
    }
  }
`);

function siftDown(t: Tracer, start: number, size: number): void {
  let root = start;
  for (;;) {
    t.vars({ root, child: undefined }).pointers({ root, child: null });
    if (2 * root + 1 >= size) {
      t.at('sift-loop')
        .explain(`${t.value(root)} (posição ${root}) não tem filhos dentro do heap.`, 'Chegamos a uma folha: o ajuste termina aqui.')
        .note('check');
      return;
    }
    let child = 2 * root + 1;
    t.vars({ child }).pointers({ child });
    if (child + 1 < size) {
      const rightBigger = t.at('compare-children').compare(child + 1, '>', child, (r, l, res) =>
        res
          ? ex(`Qual filho é maior? ${r} (direita) > ${l} (esquerda).`, `O filho da direita é o maior, então ele é o candidato a subir.`)
          : ex(`Qual filho é maior? ${l} (esquerda) é o maior ou empata.`, 'O filho da esquerda é o candidato a subir.'),
      );
      if (rightBigger) {
        child++;
        t.at('right-child').vars({ child }).pointers({ child });
      }
    }
    const ok = t.at('compare-root').compare(root, '>=', child, (p, c, res) =>
      res
        ? ex(`O pai ${p} é maior ou igual ao filho ${c}.`, 'A regra do max-heap (pai ≥ filhos) está satisfeita: o ajuste termina.')
        : ex(`O pai ${p} é menor que o filho ${c}.`, `A regra do max-heap foi quebrada: ${c} precisa subir e ${p} descer.`),
    );
    if (ok) return;
    const p = t.value(root);
    const c = t.value(child);
    t.at('swap').explain(`Trocamos ${p} com ${c}.`, `${c} sobe para a posição ${root}; ${p} desce para a posição ${child} e continuamos verificando a partir dali.`);
    t.swap(root, child);
    root = child;
  }
}

export const heapSort: AlgorithmDefinition = {
  id: 'heap',
  name: 'Heap Sort',
  tagline: 'Ordenação com max-heap',
  description:
    'Enxerga o vetor como uma árvore binária (heap) em que cada pai é maior ou igual aos filhos. O maior valor fica na raiz; ele é trocado com o fim do heap, o heap encolhe e é reajustado.',
  steps: [
    'Transforme o vetor em um max-heap (pai ≥ filhos).',
    'Troque a raiz (o maior) com o último elemento do heap.',
    'Diminua o heap: esse último elemento está na posição final.',
    'Reajuste a raiz descendo-a até o lugar certo e repita.',
  ],
  complexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)' },
  complexityNote:
    'A altura do heap é log₂ n, então cada reajuste custa no máximo log n trocas. São n extrações, totalizando n log n, sem precisar de memória extra.',
  stable: false,
  inPlace: true,
  usesAux: false,
  recursive: false,
  extraMetrics: [
    { key: 'heapifies', label: 'Ajustes (siftDown)', hint: 'Chamadas de siftDown' },
    { key: 'passes', label: 'Extrações', hint: 'Elementos retirados da raiz' },
  ],
  code,
  run(t) {
    const n = t.length;
    t.vars({ n }).heapSize(n);

    t.at('build')
      .explain(
        'Fase 1: transformar o vetor em um max-heap.',
        'Imagine o vetor como uma árvore: os filhos da posição i estão em 2i+1 e 2i+2. Ajustamos cada pai, de baixo para cima, para que fique maior que seus filhos.',
      )
      .note('phase');

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      t.at('build-sift')
        .vars({ i })
        .count('heapifies')
        .explain(`Ajustando o nó da posição ${i} (valor ${t.value(i)}).`, 'siftDown faz o valor descer enquanto for menor que algum filho.');
      t.note('heapify');
      siftDown(t, i, n);
    }

    t.vars({ i: undefined, root: undefined, child: undefined }).pointers({ root: null, child: null });
    t.at('extract-loop')
      .explain(
        `Fase 2: o maior valor (${n > 0 ? t.value(0) : '-'}) está na raiz.`,
        'Agora retiramos a raiz repetidamente, levando o maior para o fim e reconstruindo o heap com o que sobrou.',
      )
      .note('phase');

    for (let end = n - 1; end > 0; end--) {
      const top = t.value(0);
      const last = t.value(end);
      t.at('extract')
        .vars({ end })
        .pointers({ end, root: null, child: null })
        .count('passes')
        .explain(`Trocamos a raiz ${top} (o maior do heap) com ${last}, o último do heap.`, `${top} vai para a posição ${end}, que é a posição final dele.`);
      t.swap(0, end);
      t.heapSize(end).explain(`${top} está na posição definitiva ${end}.`, `O heap encolheu: agora ocupa as posições 0 a ${end - 1}.`);
      t.sorted(end);
      t.at('extract-sift')
        .count('heapifies')
        .explain(`Reajustando o heap a partir da raiz (${t.value(0)}).`, 'O valor que veio do fim provavelmente é pequeno e precisa descer.');
      t.note('heapify');
      siftDown(t, 0, end);
    }

    t.heapSize(null).pointers({ end: null, root: null, child: null }).vars({ root: undefined, child: undefined });
    t.sortRemaining('A raiz restante é o menor valor: ela já está na posição 0.', 'O heap ficou com um único elemento, então terminamos.');
  },
};
