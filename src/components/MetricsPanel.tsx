import type { ReactNode } from 'react';
import type { AlgorithmDefinition } from '../algorithms/types';
import type { Frame } from '../engine/types';
import { formatNumber } from '../utils/format';
import { Icon } from './Icon';
import { ElapsedTimer } from './PlaybackBar';

interface MetricsPanelProps {
  algorithm: AlgorithmDefinition;
  frame: Frame;
  last: number;
  elapsed: () => number;
  playing: boolean;
  onExportJson: () => void;
  onExportCsv: () => void;
}

function Metric({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: string }) {
  return (
    <div className={`metric ${accent ? `metric--${accent}` : ''}`} title={hint}>
      <span className="metric__label">{label}</span>
      <strong className="metric__value" key={typeof value === 'number' || typeof value === 'string' ? value : undefined}>
        {value}
      </strong>
    </div>
  );
}

export function MetricsPanel({ algorithm, frame, last, elapsed, playing, onExportJson, onExportCsv }: MetricsPanelProps) {
  const m = frame.metrics;
  return (
    <section className="panel metrics" aria-labelledby="metrics-title">
      <header className="panel__header">
        <h2 className="panel__title" id="metrics-title">
          Métricas
        </h2>
        <span className="muted small">valores contados durante a execução real</span>
        <div className="panel__actions">
          <button type="button" className="button button--ghost button--sm" onClick={onExportJson} title="Baixar métricas e histórico em JSON">
            <Icon name="download" size={14} /> JSON
          </button>
          <button type="button" className="button button--ghost button--sm" onClick={onExportCsv} title="Baixar histórico em CSV">
            <Icon name="download" size={14} /> CSV
          </button>
        </div>
      </header>
      <div className="metrics__grid">
        <Metric label="Comparações" value={formatNumber(m.comparisons)} accent="compare" hint="Quantas vezes dois valores foram comparados" />
        <Metric label="Trocas" value={formatNumber(m.swaps)} accent="swap" hint="Quantas vezes dois elementos trocaram de lugar" />
        <Metric label="Escritas" value={formatNumber(m.writes)} hint="Atribuições em vetores (cada troca escreve 2 posições)" />
        <Metric label="Passos" value={`${frame.step}/${last}`} hint="Operações relevantes executadas" />
        <Metric label="Tempo" value={<ElapsedTimer elapsed={elapsed} playing={playing} />} hint="Tempo de animação (não mede a eficiência do algoritmo)" />
        {algorithm.extraMetrics.map((extra) => (
          <Metric key={extra.key} label={extra.label} value={formatNumber(m[extra.key])} hint={extra.hint} accent="extra" />
        ))}
      </div>
    </section>
  );
}
