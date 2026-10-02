/**
 * Planejamento das animações entre dois quadros.
 *
 * As posições finais vêm sempre do quadro (estado), e o planejador apenas
 * descreve *como* chegar lá: arcos de troca, garras que buscam e carregam os
 * elementos, deslocamentos e quedas para o vetor auxiliar. Isso mantém a
 * animação determinística — a mesma transição gera sempre o mesmo movimento.
 */
import type { Frame, Operand } from '../engine/types';
import { boxHeight, heldTop, slotCenter, slotX, type Geometry } from './geometry';

export interface Point {
  x: number;
  y: number;
}

export interface Key extends Point {
  offset: number;
  scale?: number;
}

export type Path = Key[];

export type Layer = 'front' | 'back';

export interface BoxMotion {
  id: number;
  path: Path;
  layer: Layer;
  delay: number;
}

/** Pose da garra: centro horizontal e linha de pega (topo da caixa). */
export interface HoistPose extends Point {
  grip: boolean;
}

export type HoistMotion = { kind: 'path'; path: Path; grip: boolean } | { kind: 'goal'; goal: HoistPose | null };

export interface TransitionPlan {
  boxes: BoxMotion[];
  hoistA: HoistMotion;
  hoistB: HoistMotion;
}

export type HoistTone = 'idle' | 'compare' | 'swap' | 'pivot' | 'held' | 'move';

// --------------------------------------------------------------- poses

export function boxPose(g: Geometry, frame: Frame, id: number, values: readonly number[]): Point {
  const h = boxHeight(g, values[id]);
  if (frame.held && frame.held.id === id) return { x: slotX(g, frame.held.at), y: heldTop(g, h) };
  const mainIndex = frame.main.indexOf(id);
  if (mainIndex >= 0) return { x: slotX(g, mainIndex), y: g.floorY - h };
  const auxIndex = frame.aux ? frame.aux.indexOf(id) : -1;
  if (auxIndex >= 0 && g.trayY !== null) return { x: slotX(g, auxIndex), y: g.trayY - h };
  return { x: slotX(g, 0), y: g.floorY - h };
}

function topOf(g: Geometry, frame: Frame, values: readonly number[], operand: Operand): HoistPose | null {
  let id: number | null | undefined;
  if (operand.area === 'held') id = frame.held?.id;
  else if (operand.area === 'main') id = frame.main[operand.index];
  else id = frame.aux?.[operand.index];
  if (id === null || id === undefined) return null;
  const pose = boxPose(g, frame, id, values);
  return { x: pose.x + g.boxW / 2, y: pose.y, grip: true };
}

const main = (index: number): Operand => ({ area: 'main', index });

/** Onde cada garra deve estar ao final do quadro (null = recolhida). */
export function hoistGoals(g: Geometry, frame: Frame, values: readonly number[]): { A: HoistPose | null; B: HoistPose | null } {
  const held = frame.held ? topOf(g, frame, values, { area: 'held' }) : null;
  const action = frame.action;
  switch (action.type) {
    case 'compare': {
      if (action.right.area === 'held') return { A: held, B: topOf(g, frame, values, action.left) };
      if (action.left.area === 'held') return { A: held, B: topOf(g, frame, values, action.right) };
      return { A: topOf(g, frame, values, action.left), B: topOf(g, frame, values, action.right) };
    }
    case 'swap':
      return { A: topOf(g, frame, values, main(action.indices[1])), B: topOf(g, frame, values, main(action.indices[0])) };
    case 'pivot':
      return { A: topOf(g, frame, values, main(action.index)), B: null };
    case 'shift':
      return { A: held, B: topOf(g, frame, values, main(action.to)) };
    case 'drop':
      return { A: topOf(g, frame, values, main(action.index)), B: null };
    case 'write-from-aux':
      return { A: topOf(g, frame, values, main(action.to)), B: null };
    default:
      return { A: held, B: null };
  }
}

export function hoistTones(frame: Frame): { A: HoistTone; B: HoistTone } {
  const action = frame.action;
  switch (action.type) {
    case 'compare':
      return frame.held ? { A: 'held', B: 'compare' } : { A: 'compare', B: 'compare' };
    case 'swap':
      return { A: 'swap', B: 'swap' };
    case 'pivot':
      return { A: 'pivot', B: 'idle' };
    case 'lift':
    case 'drop':
      return { A: 'held', B: 'idle' };
    case 'shift':
      return { A: 'held', B: 'move' };
    case 'write-from-aux':
      return { A: 'move', B: 'idle' };
    default:
      return { A: frame.held ? 'held' : 'idle', B: 'idle' };
  }
}

// --------------------------------------------------------------- caminhos

const samePoint = (a: Point, b: Point) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;

/** Caminho da garra: sobe até a altura de repouso, atravessa e desce. */
export function travelPath(from: Point, to: Point | null, restY: number): Path {
  const target = to ?? { x: from.x, y: restY };
  if (samePoint(from, target)) return [];
  if (Math.abs(from.x - target.x) < 0.5) {
    return [
      { ...from, offset: 0 },
      { ...target, offset: 1 },
    ];
  }
  const up = Math.abs(from.y - restY);
  const across = Math.abs(from.x - target.x);
  const down = Math.abs(target.y - restY);
  const total = up + across + down || 1;
  return [
    { ...from, offset: 0 },
    { x: from.x, y: restY, offset: up / total },
    { x: target.x, y: restY, offset: (up + across) / total },
    { ...target, offset: 1 },
  ];
}

/** Arco de transporte: levanta, atravessa e pousa. */
function arc(from: Point, to: Point, lift: number, scale = 1): Path {
  const top = Math.min(from.y, to.y) - lift;
  return [
    { ...from, offset: 0, scale: 1 },
    { x: from.x, y: top, offset: 0.28, scale },
    { x: to.x, y: top, offset: 0.72, scale },
    { ...to, offset: 1, scale: 1 },
  ];
}

/** Comprime um caminho para o intervalo [start, 1], parado no início antes disso. */
function delayPath(path: Path, start: number): Path {
  if (start <= 0 || path.length === 0) return path;
  return [{ ...path[0], offset: 0 }, ...path.map((k) => ({ ...k, offset: start + k.offset * (1 - start) }))];
}

/** Caminho da garra que acompanha uma caixa (pega = topo, centro horizontal). */
function followBox(path: Path, g: Geometry): Path {
  return path.map((k) => ({ x: k.x + g.boxW / 2, y: k.y, offset: k.offset }));
}

/** Concatena a aproximação da garra (0..start) com o caminho de transporte. */
function approachThenFollow(current: Point, follow: Path, start: number, restY: number): Path {
  if (follow.length === 0) return follow;
  if (start <= 0) return follow;
  const approach = travelPath(current, follow[0], restY).map((k) => ({ ...k, offset: k.offset * start }));
  const rest = follow.map((k) => ({ ...k, offset: start + k.offset * (1 - start) }));
  return approach.length ? [...approach, ...rest.slice(1)] : delayPath(follow, start);
}

/** Altura de elevação para que a caixa passe por cima das que estão entre i e j. */
function clearance(g: Geometry, frame: Frame, values: readonly number[], i: number, j: number, ownHeight: number, startY: number): number {
  let tallest = 0;
  for (let k = Math.min(i, j) + 1; k < Math.max(i, j); k++) {
    const id = frame.main[k];
    if (id !== null && id !== undefined) tallest = Math.max(tallest, boxHeight(g, values[id]));
  }
  const hop = 10 + g.maxH * 0.14;
  const needed = Math.max(hop, tallest + 10);
  // não deixa a caixa ultrapassar a altura das garras recolhidas
  const maxLift = Math.max(6, startY - g.restY - 4);
  return Math.min(needed - (g.floorY - (startY + ownHeight)), maxLift);
}

export interface PlanContext {
  g: Geometry;
  values: readonly number[];
  /** Pose atual (visual) de cada garra. */
  hoistA: Point;
  hoistB: Point;
}

/**
 * Planeja a transição de `from` para `to`, onde `to` é o passo seguinte.
 * A ação de `to` decide o tipo de movimento.
 */
export function planForward(from: Frame, to: Frame, ctx: PlanContext): TransitionPlan {
  const { g, values } = ctx;
  const goals = hoistGoals(g, to, values);
  const boxes: BoxMotion[] = [];
  let hoistA: HoistMotion = { kind: 'goal', goal: goals.A };
  let hoistB: HoistMotion = { kind: 'goal', goal: goals.B };
  const handled = new Set<number>();
  const action = to.action;

  const startOf = (id: number) => boxPose(g, from, id, values);
  const endOf = (id: number) => boxPose(g, to, id, values);
  const needsApproach = (hoist: Point, box: Point) => !samePoint(hoist, { x: box.x + g.boxW / 2, y: box.y });

  switch (action.type) {
    case 'swap': {
      const [i, j] = action.indices;
      const idA = to.main[j];
      const idB = to.main[i];
      if (idA === null || idB === null) break;
      const sA = startOf(idA);
      const sB = startOf(idB);
      const liftA = clearance(g, from, values, i, j, boxHeight(g, values[idA]), sA.y);
      const liftB = clearance(g, from, values, i, j, boxHeight(g, values[idB]), sB.y);
      const pathA = arc(sA, endOf(idA), liftA, 1.04);
      const pathB = arc(sB, endOf(idB), Math.max(4, liftB * 0.8), 0.9);
      const approach = needsApproach(ctx.hoistA, sA) || needsApproach(ctx.hoistB, sB) ? 0.32 : 0;
      boxes.push({ id: idA, path: delayPath(pathA, approach), layer: 'front', delay: 0 });
      boxes.push({ id: idB, path: delayPath(pathB, approach), layer: 'back', delay: 0 });
      hoistA = { kind: 'path', path: approachThenFollow(ctx.hoistA, followBox(pathA, g), approach, g.restY), grip: true };
      hoistB = { kind: 'path', path: approachThenFollow(ctx.hoistB, followBox(pathB, g), approach, g.restY), grip: true };
      handled.add(idA).add(idB);
      break;
    }
    case 'shift': {
      const id = to.main[action.to];
      if (id === null) break;
      const s = startOf(id);
      const path = arc(s, endOf(id), 10 + g.maxH * 0.12, 0.92);
      const approach = needsApproach(ctx.hoistB, s) ? 0.3 : 0;
      boxes.push({ id, path: delayPath(path, approach), layer: 'back', delay: 0 });
      hoistB = { kind: 'path', path: approachThenFollow(ctx.hoistB, followBox(path, g), approach, g.restY), grip: true };
      handled.add(id);
      if (to.held) {
        const keyId = to.held.id;
        const k0 = startOf(keyId);
        const k1 = endOf(keyId);
        const keyPath = delayPath(
          [
            { ...k0, offset: 0 },
            { ...k1, offset: 1 },
          ],
          approach,
        );
        boxes.push({ id: keyId, path: keyPath, layer: 'front', delay: 0 });
        hoistA = { kind: 'path', path: followBox(keyPath, g), grip: true };
        handled.add(keyId);
      }
      break;
    }
    case 'lift': {
      if (!to.held) break;
      const id = to.held.id;
      const s = startOf(id);
      const path: Path = [
        { ...s, offset: 0 },
        { ...endOf(id), offset: 1 },
      ];
      const approach = needsApproach(ctx.hoistA, s) ? 0.4 : 0;
      boxes.push({ id, path: delayPath(path, approach), layer: 'front', delay: 0 });
      hoistA = { kind: 'path', path: approachThenFollow(ctx.hoistA, followBox(path, g), approach, g.restY), grip: true };
      handled.add(id);
      break;
    }
    case 'drop': {
      const id = to.main[action.index];
      if (id === null) break;
      const s = startOf(id);
      const path: Path = [
        { ...s, offset: 0 },
        { ...endOf(id), offset: 1 },
      ];
      const approach = needsApproach(ctx.hoistA, s) ? 0.3 : 0;
      boxes.push({ id, path: delayPath(path, approach), layer: 'front', delay: 0 });
      hoistA = { kind: 'path', path: approachThenFollow(ctx.hoistA, followBox(path, g), approach, g.restY), grip: true };
      handled.add(id);
      break;
    }
    case 'write-from-aux': {
      const id = to.main[action.to];
      if (id === null) break;
      const s = startOf(id);
      const e = endOf(id);
      const path: Path = [
        { ...s, offset: 0 },
        { x: s.x, y: s.y - 14, offset: 0.25 },
        { x: e.x, y: e.y - 14, offset: 0.8 },
        { ...e, offset: 1 },
      ];
      const approach = needsApproach(ctx.hoistA, s) ? 0.3 : 0;
      boxes.push({ id, path: delayPath(path, approach), layer: 'front', delay: 0 });
      hoistA = { kind: 'path', path: approachThenFollow(ctx.hoistA, followBox(path, g), approach, g.restY), grip: true };
      handled.add(id);
      break;
    }
    case 'copy-to-aux': {
      const count = action.hi - action.lo + 1;
      for (let k = action.lo; k <= action.hi; k++) {
        const id = to.aux?.[k];
        if (id === null || id === undefined) continue;
        const path: Path = [
          { ...startOf(id), offset: 0 },
          { ...endOf(id), offset: 1 },
        ];
        boxes.push({ id, path, layer: 'back', delay: (k - action.lo) / Math.max(count, 1) });
        handled.add(id);
      }
      break;
    }
    default:
      break;
  }

  // Qualquer outro elemento que tenha mudado de lugar segue em linha reta.
  for (let id = 0; id < values.length; id++) {
    if (handled.has(id)) continue;
    const s = startOf(id);
    const e = endOf(id);
    if (!samePoint(s, e)) {
      boxes.push({ id, path: [{ ...s, offset: 0 }, { ...e, offset: 1 }], layer: 'front', delay: 0 });
    }
  }

  return { boxes, hoistA, hoistB };
}

/** Inverte um plano (usado ao voltar um passo). */
export function reversePlan(plan: TransitionPlan, goals: { A: HoistPose | null; B: HoistPose | null }): TransitionPlan {
  const reversePath = (path: Path): Path => [...path].reverse().map((k) => ({ ...k, offset: 1 - k.offset }));
  const reverseHoist = (motion: HoistMotion, goal: HoistPose | null): HoistMotion =>
    motion.kind === 'path' ? { kind: 'path', path: reversePath(motion.path), grip: motion.grip } : { kind: 'goal', goal };
  const maxDelay = Math.max(0, ...plan.boxes.map((b) => b.delay));
  return {
    boxes: plan.boxes.map((b) => ({ ...b, path: reversePath(b.path), delay: maxDelay - b.delay })),
    hoistA: reverseHoist(plan.hoistA, goals.A),
    hoistB: reverseHoist(plan.hoistB, goals.B),
  };
}

/** Plano simples para saltos na linha do tempo: tudo vai direto ao destino. */
export function planJump(from: Frame, to: Frame, g: Geometry, values: readonly number[]): TransitionPlan {
  const goals = hoistGoals(g, to, values);
  const boxes: BoxMotion[] = [];
  for (let id = 0; id < values.length; id++) {
    const s = boxPose(g, from, id, values);
    const e = boxPose(g, to, id, values);
    if (!samePoint(s, e)) boxes.push({ id, path: [{ ...s, offset: 0 }, { ...e, offset: 1 }], layer: 'front', delay: 0 });
  }
  return { boxes, hoistA: { kind: 'goal', goal: goals.A }, hoistB: { kind: 'goal', goal: goals.B } };
}

export interface Focus extends Point {
  /** Alvo principal (garra A), usado quando os dois alvos estão distantes. */
  primary: Point;
  /** Distância horizontal entre os alvos. */
  span: number;
}

/** Região de interesse do quadro: onde estão as garras ou a ação atual. */
export function focusPoint(g: Geometry, frame: Frame, values: readonly number[]): Focus | null {
  const goals = hoistGoals(g, frame, values);
  const points = [goals.A, goals.B].filter((p): p is HoistPose => p !== null);
  if (points.length) {
    const xs = points.map((p) => p.x);
    return {
      x: xs.reduce((sum, x) => sum + x, 0) / xs.length,
      y: Math.min(...points.map((p) => p.y)),
      primary: { x: points[0].x, y: points[0].y },
      span: Math.max(...xs) - Math.min(...xs),
    };
  }
  const around = (lo: number, hi: number): Focus => {
    const x = (slotCenter(g, lo) + slotCenter(g, hi)) / 2;
    return { x, y: g.restY, primary: { x, y: g.restY }, span: 0 };
  };
  const action = frame.action;
  if (action.type === 'sorted' && action.indices.length) {
    return around(Math.min(...action.indices), Math.max(...action.indices));
  }
  if ((action.type === 'call' || action.type === 'partition' || action.type === 'copy-to-aux') && action.lo <= action.hi) {
    return around(action.lo, action.hi);
  }
  return null;
}
