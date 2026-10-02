const ITEMS = [
  { state: 'idle', glyph: '', label: 'Normal', hint: 'Ainda não analisado' },
  { state: 'compare', glyph: '?', label: 'Comparando', hint: 'Sendo comparado agora' },
  { state: 'swap', glyph: '⇄', label: 'Trocando', hint: 'Mudando de posição' },
  { state: 'pivot', glyph: 'P', label: 'Pivô', hint: 'Referência da partição (Quick Sort)' },
  { state: 'held', glyph: 'K', label: 'Chave', hint: 'Segurada pela garra (Insertion Sort)' },
  { state: 'sorted', glyph: '✓', label: 'Ordenado', hint: 'Na posição definitiva' },
] as const;

export function Legend({ showRanges }: { showRanges: boolean }) {
  return (
    <ul className="legend" aria-label="Legenda dos estados">
      {ITEMS.map((item) => (
        <li key={item.state} title={item.hint}>
          <span className={`legend__swatch box--${item.state}`} aria-hidden="true">
            {item.glyph}
          </span>
          {item.label}
        </li>
      ))}
      {showRanges && (
        <>
          <li title="Subvetor ativo">
            <span className="legend__bar bracket--range" aria-hidden="true" /> Subvetor
          </li>
          <li title="Elementos fora do subvetor ativo">
            <span className="legend__swatch box--idle box--dim" aria-hidden="true" /> Fora do foco
          </li>
        </>
      )}
    </ul>
  );
}
