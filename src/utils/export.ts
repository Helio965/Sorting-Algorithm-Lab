import type { AlgorithmDefinition } from '../algorithms/types';
import type { Trace } from '../engine/types';

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
}

/** Exporta as métricas finais e o histórico completo da execução em JSON. */
export function exportJson(algorithm: AlgorithmDefinition, trace: Trace): void {
  const final = trace.frames[trace.frames.length - 1];
  const data = {
    algoritmo: algorithm.name,
    geradoEm: new Date().toISOString(),
    entrada: trace.input,
    saida: trace.output,
    passos: trace.frames.length - 1,
    metricas: final.metrics,
    complexidade: algorithm.complexity,
    historico: trace.frames.map((f) => ({ passo: f.step, acao: f.action.type, mensagem: f.message })),
  };
  download(`sorting-lab-${algorithm.id}-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

/** Exporta o histórico passo a passo em CSV (abre em planilhas). */
export function exportCsv(algorithm: AlgorithmDefinition, trace: Trace): void {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const header = ['passo', 'acao', 'comparacoes', 'trocas', 'escritas', 'vetor', 'mensagem'];
  const rows = trace.frames.map((f) =>
    [
      f.step,
      f.action.type,
      f.metrics.comparisons,
      f.metrics.swaps,
      f.metrics.writes,
      f.main.map((id) => (id === null ? '_' : trace.input[id])).join(' '),
      f.message,
    ]
      .map(escape)
      .join(','),
  );
  download(`sorting-lab-${algorithm.id}-${stamp()}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8');
}
