import type { Frame } from './types';

/** Duração base (velocidade 1x) de cada tipo de passo, em milissegundos. */
const BASE_DURATION: Record<Frame['action']['type'], number> = {
  start: 450,
  compare: 950,
  swap: 1200,
  pivot: 950,
  sorted: 700,
  lift: 900,
  shift: 900,
  drop: 900,
  'copy-to-aux': 1100,
  'write-from-aux': 1000,
  call: 850,
  partition: 1400,
  pass: 900,
  note: 900,
  done: 1200,
};

/** Fração do passo dedicada à animação; o restante é tempo de leitura. */
export const ANIMATION_SHARE = 0.72;

export const SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;
export type Speed = (typeof SPEEDS)[number];

export function stepDuration(frame: Frame): number {
  return BASE_DURATION[frame.action.type];
}

export function animationDuration(frame: Frame, speed: number): number {
  return (stepDuration(frame) * ANIMATION_SHARE) / speed;
}
