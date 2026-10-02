import { useLayoutEffect, useRef } from 'react';
import type { Frame } from '../engine/types';
import { pad } from '../utils/format';

interface HistoryPanelProps {
  frames: readonly Frame[];
  index: number;
  onSeek: (index: number) => void;
}

const WINDOW = 80;

export function HistoryPanel({ frames, index, onSeek }: HistoryPanelProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const start = Math.max(1, index - WINDOW + 1);
  const visible = frames.slice(start, index + 1);
  const digits = Math.max(2, String(frames.length - 1).length);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [index, frames]);

  return (
    <section className="panel history" aria-labelledby="history-title">
      <header className="panel__header">
        <h2 className="panel__title" id="history-title">
          Histórico
        </h2>
        <span className="muted small">clique para voltar a um passo</span>
      </header>
      {index === 0 ? (
        <p className="muted small history__empty">O histórico aparece aqui assim que a execução começar.</p>
      ) : (
        <ol className="history__list" ref={listRef}>
          {start > 1 && <li className="history__more muted small">… {start - 1} passos anteriores</li>}
          {visible.map((frame) => (
            <li key={frame.step}>
              <button
                type="button"
                className={`history__item ${frame.step === index ? 'is-current' : ''}`}
                onClick={() => onSeek(frame.step)}
                aria-current={frame.step === index ? 'step' : undefined}
              >
                <span className="history__step">PASSO {pad(frame.step, digits)}</span>
                <span className="history__text">{frame.message}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
