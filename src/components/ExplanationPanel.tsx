import type { AlgorithmDefinition } from '../algorithms/types';
import { frameStatus } from '../engine/status';
import type { Frame, Trace, VarValue } from '../engine/types';

interface ExplanationPanelProps {
  algorithm: AlgorithmDefinition;
  trace: Trace;
  frame: Frame;
  educational: boolean;
  /** Anuncia a mensagem para leitores de tela (desligado durante a reprodução automática). */
  announce: boolean;
}

function formatVar(value: VarValue): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  return String(value);
}

export function StatusChip({ frame }: { frame: Frame }) {
  const status = frameStatus(frame);
  return (
    <span className={`status-chip status-chip--${status.kind}`}>
      <span className="status-chip__dot" aria-hidden="true" />
      {status.label}
    </span>
  );
}

export function ExplanationPanel({ algorithm, trace, frame, educational, announce }: ExplanationPanelProps) {
  const vars = Object.entries(frame.vars);
  const pointers = Object.entries(frame.pointers);
  const valueAt = (area: 'main' | 'aux', index: number) => {
    const id = area === 'main' ? frame.main[index] : frame.aux?.[index];
    return id === null || id === undefined ? 'vazio' : trace.input[id];
  };
  const stack = frame.callStack.map((id) => trace.calls[id]?.name).filter(Boolean);
  const m = frame.metrics;

  const context: { label: string; value: string | number }[] = [];
  if (algorithm.id === 'bubble' || algorithm.id === 'selection') {
    context.push({ label: 'Passada atual', value: m.passes || '—' });
    context.push({ label: 'Comparação na passada', value: m.passComparisons || '—' });
    context.push({ label: 'Trocas', value: m.swaps });
  } else if (algorithm.id === 'insertion') {
    context.push({ label: 'Chave', value: frame.held ? trace.input[frame.held.id] : '—' });
    context.push({ label: 'Deslocamentos', value: m.shifts });
  } else if (algorithm.id === 'heap') {
    context.push({ label: 'Tamanho do heap', value: frame.heapSize ?? '—' });
    context.push({ label: 'Trocas', value: m.swaps });
  } else {
    context.push({ label: 'Profundidade', value: frame.callStack.length || '—' });
    context.push({ label: algorithm.id === 'quick' ? 'Partições' : 'Mesclas', value: algorithm.id === 'quick' ? m.partitions : m.merges });
  }

  return (
    <section className="panel explain" aria-labelledby="explain-title">
      <header className="panel__header">
        <h2 className="panel__title" id="explain-title">
          O que está acontecendo?
        </h2>
        <StatusChip frame={frame} />
      </header>

      <div className="explain__body">
        <p className="explain__message">{frame.message}</p>
        {educational && frame.detail && <p className="explain__detail">{frame.detail}</p>}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announce ? `${frame.message} ${educational && frame.detail ? frame.detail : ''}` : ''}
        </p>

        <dl className="explain__context">
          {context.map((c) => (
            <div key={c.label}>
              <dt>{c.label}</dt>
              <dd>{c.value}</dd>
            </div>
          ))}
        </dl>

        {educational && (
          <>
            <h3 className="explain__subtitle">Variáveis</h3>
            {vars.length ? (
              <ul className="vars" aria-label="Variáveis do algoritmo">
                {vars.map(([name, value]) => (
                  <li key={name} className="vars__item">
                    <span className="vars__name">{name}</span>
                    <span className="vars__eq">=</span>
                    <span className="vars__value">{formatVar(value)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Nenhuma variável ainda. Inicie a execução.</p>
            )}

            {pointers.length > 0 && (
              <>
                <h3 className="explain__subtitle">Ponteiros</h3>
                <ul className="pointer-list">
                  {pointers.map(([name, target]) => (
                    <li key={name}>
                      <strong>{name}</strong> → {target.area === 'aux' ? 'aux' : 'posição'} {target.index}
                      <span className="muted"> (valor {valueAt(target.area, target.index)})</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {algorithm.recursive && stack.length > 0 && (
              <>
                <h3 className="explain__subtitle">Pilha de chamadas</h3>
                <ol className="call-stack">
                  {stack.map((name, i) => (
                    <li key={`${name}-${i}`} className={i === stack.length - 1 ? 'is-top' : ''}>
                      {name}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
