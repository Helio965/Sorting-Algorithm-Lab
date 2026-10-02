import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { frameStatus } from '../engine/status';
import { animationDuration } from '../engine/timing';
import type { Frame, Operand, Trace } from '../engine/types';
import { useElementWidth } from '../hooks/useElementWidth';
import { useReducedMotion } from '../hooks/useMediaQuery';
import { boxHeight, computeGeometry, POINTER_ROW_H, slotCenter, slotX, type Geometry } from './geometry';
import {
  boxPose,
  focusPoint,
  hoistGoals,
  hoistTones,
  planForward,
  planJump,
  reversePlan,
  travelPath,
  type HoistMotion,
  type Path,
  type Point,
  type TransitionPlan,
} from './motion';

interface StageProps {
  trace: Trace;
  frame: Frame;
  speed: number;
  educational: boolean;
  usesAux: boolean;
  zoom?: number;
  /** Rótulo acessível da área (útil no modo comparação). */
  label?: string;
  /** Limite (em ms, na velocidade 1x) para a duração das animações. */
  maxAnimMs?: number;
  /** Ocupa a altura disponível da janela (tela cheia). */
  fullHeight?: boolean;
}

type BoxState = 'idle' | 'compare' | 'swap' | 'move' | 'held' | 'pivot' | 'sorted';

const STATE_TEXT: Record<BoxState, string> = {
  idle: '',
  compare: 'comparando',
  swap: 'trocando',
  move: 'em movimento',
  held: 'chave segurada pelo mecanismo',
  pivot: 'pivô',
  sorted: 'ordenado',
};

function operandId(frame: Frame, operand: Operand): number | null {
  if (operand.area === 'held') return frame.held?.id ?? null;
  if (operand.area === 'main') return frame.main[operand.index] ?? null;
  return frame.aux?.[operand.index] ?? null;
}

function activeSets(frame: Frame) {
  const compare = new Set<number>();
  const swap = new Set<number>();
  const move = new Set<number>();
  const justSorted = new Set<number>();
  const add = (set: Set<number>, id: number | null | undefined) => {
    if (id !== null && id !== undefined) set.add(id);
  };
  const a = frame.action;
  switch (a.type) {
    case 'compare':
      add(compare, operandId(frame, a.left));
      add(compare, operandId(frame, a.right));
      break;
    case 'swap':
      add(swap, frame.main[a.indices[0]]);
      add(swap, frame.main[a.indices[1]]);
      break;
    case 'shift':
      add(move, frame.main[a.to]);
      break;
    case 'drop':
      add(move, frame.main[a.index]);
      break;
    case 'write-from-aux':
      add(move, frame.main[a.to]);
      break;
    case 'copy-to-aux':
      for (let k = a.lo; k <= a.hi; k++) add(move, frame.aux?.[k]);
      break;
    case 'sorted':
      for (const i of a.indices) add(justSorted, frame.main[i]);
      break;
    default:
      break;
  }
  return { compare, swap, move, justSorted };
}

function relation(a: number, b: number): string {
  return a < b ? '<' : a > b ? '>' : '=';
}

/** Texto curto do mostrador que acompanha o mecanismo. */
function readoutText(frame: Frame, values: readonly number[]): string | null {
  const a = frame.action;
  const v = (id: number | null | undefined) => (id === null || id === undefined ? '?' : String(values[id]));
  switch (a.type) {
    case 'compare': {
      const [l, r] = a.values;
      return `${l} ${relation(l, r)} ${r}`;
    }
    case 'swap':
      return `${v(frame.main[a.indices[1]])} ⇄ ${v(frame.main[a.indices[0]])}`;
    case 'pivot':
      return `PIVÔ ${v(frame.main[a.index])}`;
    case 'lift':
      return `CHAVE ${v(frame.held?.id)}`;
    case 'shift':
      return `${v(frame.main[a.to])} →`;
    case 'drop':
      return `${v(frame.main[a.index])} ↓`;
    case 'write-from-aux':
      return `${v(frame.main[a.to])} ↑`;
    case 'copy-to-aux':
      return 'AUX ↓';
    case 'sorted':
      return a.indices.length === 1 ? `✓ ${v(frame.main[a.indices[0]])}` : '✓';
    case 'partition':
      return `| ${v(frame.main[a.pivot])} |`;
    default:
      return null;
  }
}

const POINTER_TONE: Record<string, string> = {
  i: 'compare',
  j: 'range',
  'j+1': 'range',
  min: 'pivot',
  k: 'sorted',
  root: 'held',
  child: 'compare',
  end: 'sorted',
};

// ------------------------------------------------------------- animação

const boxTransform = (k: { x: number; y: number; scale?: number }) =>
  `translate(${k.x}px, ${k.y}px) scale(${k.scale ?? 1})`;

class Animator {
  private readonly running = new Map<Element, Animation[]>();

  /** Posição visual atual de um elemento em animação (e interrompe a animação). */
  interrupt(el: HTMLElement): Point | null {
    const list = this.running.get(el);
    if (!list || !list.some((a) => a.playState === 'running')) {
      this.running.delete(el);
      return null;
    }
    const t = getComputedStyle(el).transform;
    let point: Point | null = null;
    if (t && t !== 'none') {
      const m = new DOMMatrixReadOnly(t);
      point = { x: m.m41, y: m.m42 };
    }
    list.forEach((a) => a.cancel());
    this.running.delete(el);
    return point;
  }

  play(el: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
    if (typeof el.animate !== 'function') return null;
    const animation = el.animate(keyframes, options);
    const list = this.running.get(el) ?? [];
    list.push(animation);
    this.running.set(el, list);
    animation.addEventListener('finish', () => {
      const current = this.running.get(el);
      if (current) this.running.set(el, current.filter((a) => a !== animation));
    });
    return animation;
  }

  stopAll() {
    this.running.forEach((list) => list.forEach((a) => a.cancel()));
    this.running.clear();
  }
}

function toSlot(g: Geometry, x: number): number {
  return (x - g.offsetX - g.boxW / 2) / (g.boxW + g.gap);
}

function fromSlot(g: Geometry, slot: number): number {
  return g.offsetX + g.boxW / 2 + slot * (g.boxW + g.gap);
}

// ------------------------------------------------------------- componente

export function Stage({ trace, frame, speed, educational, usesAux, zoom = 1, label, maxAnimMs, fullHeight = false }: StageProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(scrollerRef);
  const reducedMotion = useReducedMotion();
  const values = trace.input;

  const minHeight = fullHeight && typeof window !== 'undefined' ? window.innerHeight - 250 : undefined;
  const g = useMemo(
    () => computeGeometry({ n: values.length, values, containerWidth: width || 720, zoom, usesAux, educational, minHeight }),
    [values, width, zoom, usesAux, educational, minHeight],
  );

  const boxEls = useRef(new Map<number, HTMLDivElement>());
  const hoistA = useRef<HTMLDivElement>(null);
  const hoistB = useRef<HTMLDivElement>(null);
  const carA = useRef<HTMLDivElement>(null);
  const carB = useRef<HTMLDivElement>(null);
  const animator = useRef(new Animator());
  const hoistPose = useRef<{ A: Point; B: Point } | null>(null);
  const last = useRef<{ trace: Trace; frame: Frame; g: Geometry } | null>(null);

  const goals = hoistGoals(g, frame, values);
  const tones = hoistTones(frame);
  const status = frameStatus(frame);

  useLayoutEffect(() => {
    const prev = last.current;
    last.current = { trace, frame, g };
    const anim = animator.current;
    const elA = hoistA.current;
    const elB = hoistB.current;
    const cA = carA.current;
    const cB = carB.current;
    if (!elA || !elB || !cA || !cB) return;

    const placeHoist = (el: HTMLElement, car: HTMLElement, p: Point) => {
      el.style.transform = `translate(${p.x - g.clawW / 2}px, ${p.y - g.clawH}px)`;
      car.style.transform = `translate(${p.x - g.carriageW / 2}px, 3px)`;
    };

    // Reinício: novo algoritmo/sequência ou mudança de layout — sem animação.
    if (!prev || prev.trace !== trace || prev.g !== g) {
      anim.stopAll();
      const old = hoistPose.current;
      const fallback = (slot: number): Point => ({ x: fromSlot(g, slot), y: g.restY });
      const keep = (p: Point | undefined, slot: number) =>
        p && prev && prev.trace === trace ? { x: fromSlot(g, toSlot(prev.g, p.x)), y: g.restY } : fallback(slot);
      const pa = goals.A ?? keep(old?.A, 0);
      const pb = goals.B ?? keep(old?.B, Math.min(1, g.n - 1));
      hoistPose.current = { A: pa, B: pb };
      placeHoist(elA, cA, pa);
      placeHoist(elB, cB, pb);
      return;
    }
    if (prev.frame === frame) return;

    const delta = frame.step - prev.frame.step;
    let stepMs =
      Math.abs(delta) === 1 ? animationDuration(delta === 1 ? frame : prev.frame, speed) : Math.min(320, 900 / speed);
    if (maxAnimMs !== undefined) stepMs = Math.min(stepMs, maxAnimMs / speed);
    const duration = Math.max(60, reducedMotion ? Math.min(stepMs, 160) : stepMs);

    const poses = hoistPose.current ?? { A: { x: fromSlot(g, 0), y: g.restY }, B: { x: fromSlot(g, 1), y: g.restY } };
    const readHoist = (el: HTMLElement, fallback: Point): Point => {
      const p = anim.interrupt(el);
      return p ? { x: p.x + g.clawW / 2, y: p.y + g.clawH } : fallback;
    };
    const currentA = readHoist(elA, poses.A);
    const currentB = readHoist(elB, poses.B);
    anim.interrupt(cA);
    anim.interrupt(cB);

    let plan: TransitionPlan;
    if (reducedMotion || Math.abs(delta) !== 1) {
      plan = planJump(prev.frame, frame, g, values);
    } else if (delta === 1) {
      plan = planForward(prev.frame, frame, { g, values, hoistA: currentA, hoistB: currentB });
    } else {
      const before = hoistGoals(g, frame, values);
      const forward = planForward(frame, prev.frame, {
        g,
        values,
        hoistA: before.A ?? { x: currentA.x, y: g.restY },
        hoistB: before.B ?? { x: currentB.x, y: g.restY },
      });
      plan = reversePlan(forward, before);
    }

    // Caixas
    const stagger = plan.boxes.some((b) => b.delay > 0);
    for (const motion of plan.boxes) {
      const el = boxEls.current.get(motion.id);
      if (!el || motion.path.length < 2) continue;
      const current = anim.interrupt(el);
      const path: Path = current ? [{ ...motion.path[0], x: current.x, y: current.y }, ...motion.path.slice(1)] : motion.path;
      el.dataset.layer = motion.layer;
      const animation = anim.play(
        el,
        path.map((k) => ({ transform: boxTransform(k), offset: k.offset, easing: 'ease-in-out' })),
        {
          duration: stagger ? duration * 0.55 : duration,
          delay: stagger ? motion.delay * duration * 0.45 : 0,
          fill: 'backwards',
        },
      );
      const clear = () => {
        if (el.dataset.layer === motion.layer) delete el.dataset.layer;
      };
      if (animation) {
        animation.addEventListener('finish', clear);
        animation.addEventListener('cancel', clear);
      } else clear();
    }

    // Garras
    const runHoist = (el: HTMLElement, car: HTMLElement, motion: HoistMotion, current: Point): Point => {
      let path: Path;
      if (motion.kind === 'path') {
        path = motion.path.length ? [{ ...motion.path[0], x: current.x, y: current.y }, ...motion.path.slice(1)] : [];
      } else {
        path = travelPath(current, motion.goal, g.restY);
      }
      const end = path.length ? path[path.length - 1] : motion.kind === 'goal' && motion.goal ? motion.goal : current;
      placeHoist(el, car, end);
      if (path.length > 1) {
        anim.play(
          el,
          path.map((k) => ({
            transform: `translate(${k.x - g.clawW / 2}px, ${k.y - g.clawH}px)`,
            offset: k.offset,
            easing: 'ease-in-out',
          })),
          { duration },
        );
        anim.play(
          car,
          path.map((k) => ({ transform: `translate(${k.x - g.carriageW / 2}px, 3px)`, offset: k.offset, easing: 'ease-in-out' })),
          { duration },
        );
      }
      return { x: end.x, y: end.y };
    };
    hoistPose.current = {
      A: runHoist(elA, cA, plan.hoistA, currentA),
      B: runHoist(elB, cB, plan.hoistB, currentB),
    };

    // Mantém o foco visível quando a área rola horizontalmente.
    const scroller = scrollerRef.current;
    const focus = focusPoint(g, frame, values);
    if (scroller && g.overflows && focus) {
      const margin = Math.min(120, scroller.clientWidth / 4);
      // Se os dois alvos cabem na tela, centraliza entre eles; senão, segue a garra principal.
      const target = focus.span <= scroller.clientWidth - 2 * margin ? focus.x : focus.primary.x;
      if (target < scroller.scrollLeft + margin || target > scroller.scrollLeft + scroller.clientWidth - margin) {
        scroller.scrollTo({ left: target - scroller.clientWidth / 2, behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    }
  });

  // ------------------------------------------------------------- render
  const sets = activeSets(frame);
  const range = frame.range;
  const dimRange = range && ['call', 'split', 'merge', 'partition'].includes(range.kind) ? range : null;
  const readout = readoutText(frame, values);
  const focus = focusPoint(g, frame, values);
  const moveMs = Math.max(80, Math.min(600, 450 / speed));

  const boxes = values.map((value, id) => {
    const pose = boxPose(g, frame, id, values);
    const h = boxHeight(g, value);
    const mainIndex = frame.main.indexOf(id);
    const auxIndex = frame.aux ? frame.aux.indexOf(id) : -1;
    const isHeld = frame.held?.id === id;
    let state: BoxState = 'idle';
    // O pivô e a chave mantêm sua cor ao serem comparados (ganham um anel).
    const probed = sets.compare.has(id) && (frame.pivotId === id || isHeld);
    if (sets.swap.has(id)) state = 'swap';
    else if (sets.compare.has(id) && !probed) state = 'compare';
    else if (sets.move.has(id)) state = 'move';
    else if (isHeld) state = 'held';
    else if (frame.pivotId === id) state = 'pivot';
    else if (frame.sorted[id]) state = 'sorted';
    const dim = dimRange !== null && mainIndex >= 0 && !frame.sorted[id] && (mainIndex < dimRange.lo || mainIndex > dimRange.hi);
    const tagState: BoxState = frame.pivotId === id && state !== 'swap' && state !== 'compare' ? 'pivot' : state;
    const wide = g.boxW >= 46;
    const tag =
      g.verticalLabels || h < 34
        ? null
        : tagState === 'pivot'
          ? wide
            ? 'PIVÔ'
            : 'P'
          : tagState === 'sorted'
            ? '✓'
            : tagState === 'swap'
              ? '⇄'
              : tagState === 'compare'
                ? '?'
                : tagState === 'held'
                  ? wide
                    ? 'CHAVE'
                    : 'K'
                  : null;
    const where = isHeld
      ? 'segurado pelo mecanismo'
      : mainIndex >= 0
        ? `posição ${mainIndex}`
        : `posição ${auxIndex} do vetor auxiliar`;
    const extra = [STATE_TEXT[state], probed ? 'comparando' : '', frame.pivotId === id && state !== 'pivot' ? 'pivô' : '', frame.sorted[id] && state !== 'sorted' ? 'ordenado' : '']
      .filter(Boolean)
      .join(', ');
    return (
      <div
        key={id}
        ref={(el) => {
          if (el) boxEls.current.set(id, el);
          else boxEls.current.delete(id);
        }}
        role="listitem"
        aria-label={`Valor ${value}, ${where}${extra ? `, ${extra}` : ''}`}
        className={[
          'box',
          `box--${state}`,
          dim ? 'box--dim' : '',
          sets.justSorted.has(id) ? 'box--just-sorted' : '',
          probed ? 'box--probed' : '',
          frame.sorted[id] && state !== 'sorted' ? 'box--was-sorted' : '',
          g.verticalLabels ? 'box--vertical' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          width: g.boxW,
          height: h,
          transform: `translate(${pose.x}px, ${pose.y}px)`,
          fontSize: g.fontSize,
        }}
      >
        {tag && (
          <span className="box__tag" aria-hidden="true">
            {tag}
          </span>
        )}
        <span className="box__value">{value}</span>
      </div>
    );
  });

  // Ponteiros agrupados por posição para empilhar quando coincidem.
  const pointerEls: ReactNode[] = [];
  if (educational) {
    const stacks = new Map<string, number>();
    for (const [name, target] of Object.entries(frame.pointers)) {
      const baseY = target.area === 'main' ? g.pointerY : g.auxPointerY;
      if (baseY === null) continue;
      const key = `${target.area}:${target.index}`;
      const level = stacks.get(key) ?? 0;
      stacks.set(key, level + 1);
      pointerEls.push(
        <div
          key={`${target.area}-${name}`}
          className={`pointer pointer--${POINTER_TONE[name] ?? 'muted'}`}
          style={{
            transform: `translate(${slotCenter(g, target.index)}px, ${baseY + level * POINTER_ROW_H}px)`,
            transitionDuration: `${moveMs}ms`,
          }}
          aria-hidden="true"
        >
          <span>▲ {name}</span>
        </div>,
      );
    }
  }

  const bracket = (key: string, lo: number, hi: number, tone: string, y: number, title: string) =>
    lo <= hi ? (
      <div
        key={key}
        className={`bracket bracket--${tone}`}
        title={title}
        style={{ left: slotX(g, lo) - 2, width: slotX(g, hi) - slotX(g, lo) + g.boxW + 4, top: y }}
      />
    ) : null;

  const brackets: ReactNode[] = [];
  if (range) {
    const y = g.bracketY;
    if (range.kind === 'partition' && range.mid !== undefined) {
      brackets.push(bracket('pl', range.lo, range.mid - 1, 'left', y, 'menores que o pivô'));
      brackets.push(bracket('pp', range.mid, range.mid, 'pivot', y, 'pivô'));
      brackets.push(bracket('pr', range.mid + 1, range.hi, 'right', y, 'maiores ou iguais ao pivô'));
    } else if ((range.kind === 'split' || range.kind === 'merge') && range.mid !== undefined) {
      brackets.push(bracket('ml', range.lo, range.mid, 'left', y, 'metade esquerda'));
      brackets.push(bracket('mr', range.mid + 1, range.hi, 'right', y, 'metade direita'));
    } else {
      const tone = range.kind === 'prefix' ? 'sorted' : range.kind === 'unsorted' ? 'muted' : 'range';
      brackets.push(bracket('r', range.lo, range.hi, tone, y, range.label ?? 'subvetor'));
    }
  }
  if (frame.heapSize !== null && frame.heapSize > 0) {
    brackets.push(bracket('heap', 0, frame.heapSize - 1, 'pivot', g.bracketY, 'heap'));
  }

  const indexes: ReactNode[] = [];
  if (g.showIndexes) {
    for (let i = 0; i < g.n; i++) {
      if (i % g.indexEvery !== 0 && i !== g.n - 1) continue;
      indexes.push(
        <span key={i} className="slot-index" style={{ left: slotCenter(g, i), top: g.floorY + 4 }} aria-hidden="true">
          {i}
        </span>,
      );
      if (g.trayY !== null) {
        indexes.push(
          <span key={`a${i}`} className="slot-index slot-index--aux" style={{ left: slotCenter(g, i), top: g.trayY + 2 }} aria-hidden="true" />,
        );
      }
    }
  }

  // Alvos muito distantes: o mostrador acompanha a garra principal.
  const anchor = focus ? (focus.span > 240 ? { x: focus.primary.x, y: focus.primary.y } : focus) : null;
  const readoutY = anchor ? Math.max(g.restY + 2, Math.min(anchor.y - 34, g.floorY - 60)) : g.restY;
  const readoutX = anchor ? Math.min(g.width - 50, Math.max(50, anchor.x)) : g.width / 2;

  return (
    <div className="stage" data-status={status.kind}>
      <div className="stage__scroller" ref={scrollerRef} tabIndex={g.overflows ? 0 : -1} aria-label={g.overflows ? 'Área de animação (role horizontalmente)' : undefined}>
        <div className="stage__canvas" style={{ width: g.width, height: g.height }}>
          <div className="stage__legs" aria-hidden="true" />
          <div className="stage__floor" style={{ top: g.floorY }} aria-hidden="true" />
          {g.trayY !== null && g.trayTop !== null && (
            <div className="stage__tray" style={{ top: g.trayTop, height: g.trayY - g.trayTop }} aria-hidden="true">
              <span>VETOR AUXILIAR</span>
            </div>
          )}

          {brackets}
          {indexes}

          <div className="stage__boxes" role="list" aria-label={label ?? 'Elementos do vetor'}>
            {boxes}
          </div>

          {pointerEls}

          <div ref={hoistB} className={`hoist hoist--b tone-${tones.B} ${goals.B ? 'is-grip' : ''}`} style={{ width: g.clawW, height: g.clawH }} aria-hidden="true">
            <span className="hoist__cable" />
            <span className="hoist__block" />
            <span className="hoist__bar" />
            <span className="hoist__finger hoist__finger--l" />
            <span className="hoist__finger hoist__finger--r" />
          </div>
          <div ref={hoistA} className={`hoist hoist--a tone-${tones.A} ${goals.A ? 'is-grip' : ''}`} style={{ width: g.clawW, height: g.clawH }} aria-hidden="true">
            <span className="hoist__cable" />
            <span className="hoist__block" />
            <span className="hoist__bar" />
            <span className="hoist__finger hoist__finger--l" />
            <span className="hoist__finger hoist__finger--r" />
          </div>

          <div className="stage__rail" style={{ height: g.railH }} aria-hidden="true" />
          <div ref={carB} className={`carriage carriage--b tone-${tones.B}`} style={{ width: g.carriageW }} aria-hidden="true" />
          <div ref={carA} className={`carriage carriage--a tone-${tones.A}`} style={{ width: g.carriageW }} aria-hidden="true" />

          {readout && (
            <div
              className={`readout readout--${status.kind}`}
              style={{ transform: `translate(${readoutX}px, ${readoutY}px)`, transitionDuration: `${moveMs}ms` }}
              aria-hidden="true"
            >
              <span>{readout}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
