/**
 * Código exibido no painel "CÓDIGO".
 *
 * As linhas podem ser marcadas com rótulos no formato `//@rotulo` (ou vários:
 * `//@a @b`). Os marcadores são removidos da exibição e permitem que os
 * algoritmos destaquem linhas pelo nome, sem números fixos que quebrariam ao
 * editar o código.
 */
export interface CodeListing {
  readonly lines: readonly string[];
  /** Rótulo → número da linha (começando em 1). */
  readonly labels: Readonly<Record<string, number>>;
}

const MARKER = /\s*\/\/@(\S+(?:\s+@\S+)*)\s*$/;

export function defineCode(source: string): CodeListing {
  const raw = source.replace(/^\s*\n/, '').replace(/\s+$/, '').split('\n');
  const indents = raw.filter((line) => line.trim().length > 0).map((line) => line.length - line.trimStart().length);
  const indent = indents.length ? Math.min(...indents) : 0;

  const lines: string[] = [];
  const labels: Record<string, number> = {};

  raw.forEach((original, index) => {
    let text = original.slice(indent);
    const match = MARKER.exec(text);
    if (match) {
      text = text.slice(0, match.index);
      for (const token of match[1].split(/\s+/)) {
        const label = token.replace(/^@/, '');
        if (label in labels) throw new Error(`Rótulo de código duplicado: ${label}`);
        labels[label] = index + 1;
      }
    }
    lines.push(text.replace(/\s+$/, ''));
  });

  return { lines, labels };
}
