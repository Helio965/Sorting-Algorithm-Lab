import { useId, useMemo } from 'react';
import { ALGORITHMS, getAlgorithm, type AlgorithmId } from '../algorithms';
import type { AlgorithmDefinition } from '../algorithms/types';
import { runAlgorithm } from '../engine/run';
import type { Frame, Metrics, Trace } from '../engine/types';
import { usePlayer, type Player, type PlayMode } from '../hooks/usePlayer';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { formatNumber } from '../utils/format';
import { Stage } from '../visualization/Stage';
import { StatusChip } from './ExplanationPanel';
import { PlaybackBar } from './PlaybackBar';

interface ComparisonViewProps {
  values: readonly number[];
  ids: [AlgorithmId, AlgorithmId];
  onIds: (ids: [AlgorithmId, AlgorithmId]) => void;
  speed: number;
  mode: PlayMode;
  educational: boolean;
  onGenerate: () => void;
  shortcutsEnabled: boolean;
  onHelp: () => void;
}

/** Na comparação, ambos avançam um passo por vez, no mesmo ritmo. */
const COMPARE_STEP_MS = 800;
const fixedDuration = () => COMPARE_STEP_MS;

const ROWS: { key: keyof Metrics; label: string; hint: string }[] = [
  { key: 'comparisons', label: 'Comparações', hint: 'Comparações entre valores' },
  { key: 'swaps', label: 'Trocas', hint: 'Trocas de posição entre dois elementos' },
  { key: 'writes', label: 'Escritas', hint: 'Atribuições em vetores (troca = 2)' },
];

function Lane({ algorithm, trace, frame, finishedAt, speed, educational }: {
  algorithm: AlgorithmDefinition;
  trace: Trace;
  frame: Frame;
  finishedAt: number | null;
  speed: number;
  educational: boolean;
}) {
  const m = frame.metrics;
  return (
    <section className="panel lane" aria-label={`Execução do ${algorithm.name}`}>
      <header className="lane__header">
        <div>
          <h2 className="lane__title">{algorithm.name}</h2>
          <p className="lane__tagline">{algorithm.tagline}</p>
        </div>
        <StatusChip frame={frame} />
      </header>
      <Stage
        trace={trace}
        frame={frame}
        speed={speed}
        educational={educational}
        usesAux={algorithm.usesAux}
        label={`Elementos — ${algorithm.name}`}
        maxAnimMs={COMPARE_STEP_MS * 0.85}
      />
      <p className="lane__message">{frame.message}</p>
      <dl className="lane__metrics">
        <div>
          <dt>Comparações</dt>
          <dd>{formatNumber(m.comparisons)}</dd>
        </div>
        <div>
          <dt>Trocas</dt>
          <dd>{formatNumber(m.swaps)}</dd>
        </div>
        <div>
          <dt>Escritas</dt>
          <dd>{formatNumber(m.writes)}</dd>
        </div>
        <div>
          <dt>Passos</dt>
          <dd>
            {frame.step}
            <span className="muted">/{trace.frames.length - 1}</span>
          </dd>
        </div>
      </dl>
      {finishedAt !== null && <p className="lane__done">✓ Concluído em {finishedAt} passos</p>}
    </section>
  );
}

function SummaryTable({ items }: { items: { algorithm: AlgorithmDefinition; trace: Trace }[] }) {
  const finals = items.map((it) => it.trace.frames[it.trace.frames.length - 1].metrics);
  const rows: { label: string; hint: string; values: number[] }[] = [
    ...ROWS.map((r) => ({ label: r.label, hint: r.hint, values: finals.map((f) => f[r.key]) })),
    { label: 'Passos', hint: 'Operações relevantes animadas', values: items.map((it) => it.trace.frames.length - 1) },
  ];
  if (items.some((it) => it.algorithm.recursive)) {
    rows.push({ label: 'Recursões', hint: 'Chamadas recursivas', values: finals.map((f) => f.calls) });
  }
  return (
    <table className="summary-table">
      <thead>
        <tr>
          <th scope="col">Métrica</th>
          {items.map((it) => (
            <th scope="col" key={it.algorithm.id}>
              {it.algorithm.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const max = Math.max(1, ...row.values);
          return (
            <tr key={row.label}>
              <th scope="row" title={row.hint}>
                {row.label}
              </th>
              {row.values.map((value, i) => (
                <td key={items[i].algorithm.id}>
                  <span className="summary-table__value">{formatNumber(value)}</span>
                  <span className="summary-table__bar" style={{ width: `${(value / max) * 100}%` }} aria-hidden="true" />
                </td>
              ))}
            </tr>
          );
        })}
        <tr>
          <th scope="row">Complexidade (médio)</th>
          {items.map((it) => (
            <td key={it.algorithm.id}>{it.algorithm.complexity.average}</td>
          ))}
        </tr>
        <tr>
          <th scope="row">Pior caso</th>
          {items.map((it) => (
            <td key={it.algorithm.id}>{it.algorithm.complexity.worst}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

function differences(a: { algorithm: AlgorithmDefinition; trace: Trace }, b: { algorithm: AlgorithmDefinition; trace: Trace }): string[] {
  const fa = a.trace.frames[a.trace.frames.length - 1].metrics;
  const fb = b.trace.frames[b.trace.frames.length - 1].metrics;
  return ROWS.map((row) => {
    const va = fa[row.key];
    const vb = fb[row.key];
    const name = row.label.toLowerCase();
    if (va === vb) return `Ambos fizeram ${formatNumber(va)} ${name}.`;
    const [fewer, more, diff] = va < vb ? [a, b, vb - va] : [b, a, va - vb];
    return `${fewer.algorithm.name} fez ${formatNumber(diff)} ${name} a menos que ${more.algorithm.name}.`;
  });
}

export function ComparisonView({ values, ids, onIds, speed, mode, educational, onGenerate, shortcutsEnabled, onHelp }: ComparisonViewProps) {
  const selectA = useId();
  const selectB = useId();
  const algoA = getAlgorithm(ids[0]);
  const algoB = getAlgorithm(ids[1]);
  const traceA = useMemo(() => runAlgorithm(algoA, values), [algoA, values]);
  const traceB = useMemo(() => runAlgorithm(algoB, values), [algoB, values]);

  // Linha do tempo comum: tem o tamanho da execução mais longa e muda de
  // identidade sempre que qualquer lado muda (o que reinicia o player).
  const timeline = useMemo(() => {
    const longer = traceA.frames.length >= traceB.frames.length ? traceA.frames : traceB.frames;
    return longer.slice();
  }, [traceA, traceB]);
  const player: Player = usePlayer(timeline, { speed, mode, durationOf: fixedDuration });

  const frameA = traceA.frames[Math.min(player.index, traceA.frames.length - 1)];
  const frameB = traceB.frames[Math.min(player.index, traceB.frames.length - 1)];
  const lastA = traceA.frames.length - 1;
  const lastB = traceB.frames.length - 1;
  const finished = player.finished;

  useKeyboardShortcuts(
    {
      ' ': () => player.toggle(),
      arrowright: () => player.next(),
      arrowleft: () => player.prev(),
      home: () => player.seek(0),
      end: () => player.seek(player.last),
      r: () => player.restart(),
      g: () => onGenerate(),
      '?': () => onHelp(),
    },
    shortcutsEnabled,
  );

  const allTraces = useMemo(() => ALGORITHMS.map((algorithm) => ({ algorithm, trace: runAlgorithm(algorithm, values) })), [values]);

  return (
    <div className="compare">
      <section className="panel compare__picker" aria-label="Escolha dos algoritmos">
        <div className="field">
          <label className="field__label" htmlFor={selectA}>
            Algoritmo A
          </label>
          <select id={selectA} className="select" value={ids[0]} onChange={(e) => onIds([e.target.value as AlgorithmId, ids[1]])}>
            {ALGORITHMS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <span className="compare__vs" aria-hidden="true">
          VS
        </span>
        <div className="field">
          <label className="field__label" htmlFor={selectB}>
            Algoritmo B
          </label>
          <select id={selectB} className="select" value={ids[1]} onChange={(e) => onIds([ids[0], e.target.value as AlgorithmId])}>
            {ALGORITHMS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <p className="compare__input">
          Mesma sequência para os dois: <code>{values.join(' ')}</code>
        </p>
      </section>

      <PlaybackBar player={player} mode={mode} milestones={[]} />

      <div className="compare__lanes">
        <Lane algorithm={algoA} trace={traceA} frame={frameA} finishedAt={player.index >= lastA ? lastA : null} speed={speed} educational={educational} />
        <Lane algorithm={algoB} trace={traceB} frame={frameB} finishedAt={player.index >= lastB ? lastB : null} speed={speed} educational={educational} />
      </div>

      <section className="panel compare__summary" aria-labelledby="summary-title">
        <header className="panel__header">
          <h2 className="panel__title" id="summary-title">
            Resultado
          </h2>
          {!finished && (
            <button type="button" className="button button--ghost button--sm" onClick={() => player.seek(player.last)}>
              Ver resultado agora
            </button>
          )}
        </header>
        {finished ? (
          <>
            <SummaryTable
              items={[
                { algorithm: algoA, trace: traceA },
                { algorithm: algoB, trace: traceB },
              ]}
            />
            <ul className="compare__facts">
              {differences({ algorithm: algoA, trace: traceA }, { algorithm: algoB, trace: traceB }).map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
            <p className="small muted">
              As métricas contam operações reais e não dependem da velocidade da animação. Um algoritmo pode fazer menos
              comparações e mais escritas que outro: o “melhor” depende do que é mais caro no seu contexto e do tipo de
              entrada.
            </p>
          </>
        ) : (
          <p className="muted">O resumo comparativo aparece quando as duas execuções terminarem.</p>
        )}
      </section>

      <details className="panel compare__all">
        <summary>
          <span className="panel__title">Todos os algoritmos com esta sequência</span>
        </summary>
        <SummaryTable items={allTraces} />
      </details>
    </div>
  );
}
