import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { CallNode, Frame, Trace } from '../engine/types';

interface RecursionTreeProps {
  trace: Trace;
  frame: Frame;
  onSeek: (step: number) => void;
}

type NodeState = 'done' | 'active' | 'current';

/** Árvore de chamadas recursivas revelada conforme a execução avança. */
export function RecursionTree({ trace, frame, onSeek }: RecursionTreeProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const step = frame.step;
  const onStack = new Set(frame.callStack);
  const top = frame.callStack[frame.callStack.length - 1];

  useLayoutEffect(() => {
    const container = listRef.current;
    const current = container?.querySelector<HTMLElement>('.rtree__node.is-current');
    if (!container || !current) return;
    const offset = current.offsetTop - container.offsetTop;
    if (offset < container.scrollTop || offset > container.scrollTop + container.clientHeight - 30) {
      container.scrollTop = offset - container.clientHeight / 2;
    }
  }, [step]);

  const state = (node: CallNode): NodeState => (node.id === top ? 'current' : onStack.has(node.id) ? 'active' : 'done');

  const render = (node: CallNode): ReactNode => {
    if (node.startStep > step) return null;
    const s = state(node);
    const children = node.children.map((id) => trace.calls[id]).filter((c) => c.startStep <= step);
    const range = node.lo <= node.hi ? `[${node.lo}..${node.hi}]` : 'vazio';
    return (
      <li key={node.id}>
        <button
          type="button"
          className={`rtree__node is-${s}`}
          onClick={() => onSeek(node.startStep)}
          title={`Ir para o passo ${node.startStep}`}
          aria-current={s === 'current' ? 'step' : undefined}
        >
          <span className="rtree__name">{node.name}</span>
          <span className="rtree__range">{range}</span>
          {node.result && node.resultStep !== null && node.resultStep <= step && <span className="rtree__result">{node.result}</span>}
          <span className="sr-only">{s === 'current' ? '(executando agora)' : s === 'active' ? '(aguardando retorno)' : '(concluída)'}</span>
        </button>
        {children.length > 0 && <ul>{children.map(render)}</ul>}
      </li>
    );
  };

  const roots = trace.calls.filter((c) => c.parent === null);
  return (
    <section className="panel rtree" aria-labelledby="rtree-title">
      <header className="panel__header">
        <h2 className="panel__title" id="rtree-title">
          Árvore de recursão
        </h2>
        <span className="muted small">
          {frame.metrics.calls} de {trace.calls.length} chamadas
        </span>
      </header>
      <div className="rtree__scroll" ref={listRef}>
        {step === 0 || roots.every((r) => r.startStep > step) ? (
          <p className="muted small">As chamadas recursivas aparecem aqui durante a execução.</p>
        ) : (
          <ul className="rtree__list">{roots.map(render)}</ul>
        )}
      </div>
      <ul className="rtree__legend small" aria-label="Legenda da árvore">
        <li>
          <span className="rtree__swatch is-current" /> executando
        </li>
        <li>
          <span className="rtree__swatch is-active" /> aguardando
        </li>
        <li>
          <span className="rtree__swatch is-done" /> concluída
        </li>
      </ul>
    </section>
  );
}
