import { useLayoutEffect, useRef, useState } from 'react';
import type { CodeListing } from '../engine/code';
import type { Annotation } from '../engine/types';
import { Icon } from './Icon';

interface CodePanelProps {
  title: string;
  code: CodeListing;
  line: number | null;
  annotation: Annotation | null;
}

const KEYWORDS = /\b(function|const|let|for|while|if|else|return|break|true|false)\b/g;

/** Realce de sintaxe mínimo (palavras-chave, números e comentários). */
function highlight(text: string) {
  const comment = text.indexOf('//');
  const code = comment >= 0 ? text.slice(0, comment) : text;
  const rest = comment >= 0 ? text.slice(comment) : '';
  const parts: (string | { kind: string; text: string })[] = [];
  let last = 0;
  const pattern = new RegExp(`${KEYWORDS.source}|\\b(\\d+)\\b|\\b([a-zA-Z_]\\w*)(?=\\()`, 'g');
  for (const match of code.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(code.slice(last, index));
    const kind = match[1] ? 'kw' : match[2] ? 'num' : 'fn';
    parts.push({ kind, text: match[0] });
    last = index + match[0].length;
  }
  if (last < code.length) parts.push(code.slice(last));
  if (rest) parts.push({ kind: 'comment', text: rest });
  return parts.map((part, i) =>
    typeof part === 'string' ? (
      part
    ) : (
      <span key={i} className={`tok-${part.kind}`}>
        {part.text}
      </span>
    ),
  );
}

export function CodePanel({ title, code, line, annotation }: CodePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Mantém a linha ativa visível rolando apenas o painel (não a página).
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container || line === null) return;
    const el = container.querySelector<HTMLElement>(`[data-line="${line}"]`);
    if (!el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < container.scrollTop + 8) container.scrollTop = Math.max(0, top - 24);
    else if (bottom > container.scrollTop + container.clientHeight - 8) container.scrollTop = bottom - container.clientHeight + 24;
  }, [line, code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.lines.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="panel code-panel" aria-labelledby="code-title">
      <header className="panel__header">
        <h2 className="panel__title" id="code-title">
          Código
        </h2>
        <span className="code-panel__file">{title}</span>
        <button type="button" className="icon-button icon-button--sm" onClick={copy} aria-label="Copiar código" title="Copiar código">
          <Icon name={copied ? 'check' : 'copy'} size={15} />
        </button>
      </header>
      <div className="code-panel__scroll" ref={scrollRef}>
        <pre className="code" aria-label={`Código do ${title}`}>
          {code.lines.map((text, i) => {
            const number = i + 1;
            const active = number === line;
            return (
              <div key={number} data-line={number} className={`code__line ${active ? 'is-active' : ''}`} aria-current={active ? 'step' : undefined}>
                <span className="code__marker" aria-hidden="true">
                  {active ? '▶' : ''}
                </span>
                <span className="code__number" aria-hidden="true">
                  {number}
                </span>
                <code className="code__text">{highlight(text)}</code>
                {active && annotation && (
                  <span className={`code__note code__note--${annotation.tone}`}>
                    {annotation.text}
                    {annotation.tone !== 'info' && <em>{annotation.tone === 'true' ? ' verdadeiro' : ' falso'}</em>}
                  </span>
                )}
              </div>
            );
          })}
        </pre>
      </div>
    </section>
  );
}
