import type { Frame, Operand, Trace } from '../engine/types';

interface HeapTreeProps {
  trace: Trace;
  frame: Frame;
}

/** Visualiza o vetor como a árvore binária que o Heap Sort enxerga. */
export function HeapTree({ trace, frame }: HeapTreeProps) {
  const n = frame.main.length;
  const heapSize = frame.heapSize ?? (frame.step === 0 ? n : 0);
  const levels = Math.max(1, Math.ceil(Math.log2(n + 1)));
  const width = Math.max(320, 2 ** (levels - 1) * 28);
  const levelH = 54;
  const height = levels * levelH + 10;
  const r = Math.min(15, Math.max(10, 320 / Math.max(n, 8)));

  const pos = (i: number) => {
    const depth = Math.floor(Math.log2(i + 1));
    const first = 2 ** depth - 1;
    const slots = 2 ** depth;
    return { x: ((i - first + 0.5) / slots) * width, y: depth * levelH + r + 6 };
  };

  const highlight = new Map<number, string>();
  const a = frame.action;
  const mark = (op: Operand, kind: string) => {
    if (op.area === 'main') highlight.set(op.index, kind);
  };
  if (a.type === 'compare') {
    mark(a.left, 'compare');
    mark(a.right, 'compare');
  } else if (a.type === 'swap') {
    highlight.set(a.indices[0], 'swap');
    highlight.set(a.indices[1], 'swap');
  }

  const nodes = frame.main.map((id, i) => ({ i, id, value: id === null ? null : trace.input[id] }));

  return (
    <section className="panel heap-tree" aria-labelledby="heap-title">
      <header className="panel__header">
        <h2 className="panel__title" id="heap-title">
          Árvore do heap
        </h2>
        <span className="muted small">filhos de i: 2i+1 e 2i+2</span>
      </header>
      <div className="heap-tree__scroll">
      <svg
        className="heap-tree__svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Heap com ${heapSize} elementos. Raiz: ${heapSize > 0 && nodes[0].value !== null ? nodes[0].value : 'nenhuma'}.`}
      >
        {nodes.map(({ i }) => {
          if (i === 0) return null;
          const parent = Math.floor((i - 1) / 2);
          const p = pos(parent);
          const c = pos(i);
          const inHeap = i < heapSize;
          return <line key={`e${i}`} x1={p.x} y1={p.y} x2={c.x} y2={c.y} className={`heap-tree__edge ${inHeap ? '' : 'is-out'}`} />;
        })}
        {nodes.map(({ i, id, value }) => {
          const c = pos(i);
          const inHeap = i < heapSize;
          const kind = highlight.get(i) ?? (id !== null && frame.sorted[id] ? 'sorted' : inHeap ? 'idle' : 'out');
          return (
            <g key={i} className={`heap-tree__node is-${kind}`} transform={`translate(${c.x} ${c.y})`}>
              <circle r={r} />
              <text dy="0.35em" fontSize={r * 0.95}>
                {value ?? ''}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      <p className="small muted">
        Nós apagados já saíram do heap e estão na posição final. A regra do max-heap: todo pai ≥ seus filhos.
      </p>
    </section>
  );
}
