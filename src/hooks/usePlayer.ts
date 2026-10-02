import { useCallback, useEffect, useRef, useState } from 'react';
import { stepDuration } from '../engine/timing';
import type { Frame } from '../engine/types';

export type PlayMode = 'auto' | 'step';

export interface Player {
  index: number;
  /** Índice do último quadro. */
  last: number;
  playing: boolean;
  finished: boolean;
  play(): void;
  pause(): void;
  toggle(): void;
  next(): void;
  prev(): void;
  seek(index: number): void;
  restart(): void;
  /** Tempo (ms) em que a animação esteve tocando. */
  elapsed(): number;
}

interface State {
  source: readonly Frame[];
  index: number;
  playing: boolean;
}

/**
 * Controla a reprodução de uma linha do tempo de quadros.
 *
 * Existe no máximo um temporizador ativo: o efeito agenda o próximo passo e
 * sua limpeza cancela o anterior. Trocar de execução (novo `frames`)
 * reinicia tudo automaticamente — índice, reprodução e tempo.
 */
export function usePlayer(
  frames: readonly Frame[],
  options: { speed: number; mode: PlayMode; durationOf?: (frame: Frame) => number },
): Player {
  const { speed, mode } = options;
  const durationOf = options.durationOf ?? stepDuration;
  const [state, setState] = useState<State>({ source: frames, index: 0, playing: false });

  // Estado derivado: uma nova execução sempre começa do zero.
  let current = state;
  if (state.source !== frames) {
    current = { source: frames, index: 0, playing: false };
    setState(current);
  }

  const last = Math.max(0, frames.length - 1);
  const index = Math.min(current.index, last);
  const playing = current.playing && mode === 'auto';

  // --- cronômetro
  const elapsedRef = useRef(0);
  const startedRef = useRef<number | null>(null);
  useEffect(() => {
    elapsedRef.current = 0;
    startedRef.current = null;
  }, [frames]);
  useEffect(() => {
    if (playing) {
      startedRef.current = performance.now();
      return () => {
        if (startedRef.current !== null) elapsedRef.current += performance.now() - startedRef.current;
        startedRef.current = null;
      };
    }
    return undefined;
  }, [playing, frames]);

  // No modo passo a passo nada avança sozinho.
  useEffect(() => {
    if (mode === 'step') setState((s) => (s.playing ? { ...s, playing: false } : s));
  }, [mode]);

  // --- avanço automático
  useEffect(() => {
    if (!playing) return undefined;
    if (index >= last) {
      setState((s) => (s.source === frames ? { ...s, playing: false } : s));
      return undefined;
    }
    const delay = Math.max(16, durationOf(frames[index]) / speed);
    const timer = window.setTimeout(() => {
      setState((s) => (s.source === frames && s.playing ? { ...s, index: Math.min(s.index + 1, last) } : s));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, speed, frames, durationOf]);

  const update = useCallback(
    (fn: (s: State) => State) => setState((s) => (s.source === frames ? fn(s) : fn({ source: frames, index: 0, playing: false }))),
    [frames],
  );

  const play = useCallback(() => {
    if (mode !== 'auto') return;
    if (index >= last) {
      startedRef.current = null;
      elapsedRef.current = 0;
    }
    update((s) => (s.index >= last ? { ...s, index: 0, playing: true } : { ...s, playing: true }));
  }, [mode, update, last, index]);

  const pause = useCallback(() => update((s) => ({ ...s, playing: false })), [update]);

  const next = useCallback(() => update((s) => ({ ...s, playing: false, index: Math.min(s.index + 1, last) })), [update, last]);

  const prev = useCallback(() => update((s) => ({ ...s, playing: false, index: Math.max(s.index - 1, 0) })), [update]);

  const seek = useCallback(
    (target: number) => update((s) => ({ ...s, playing: false, index: Math.max(0, Math.min(last, Math.round(target))) })),
    [update, last],
  );

  const restart = useCallback(() => {
    startedRef.current = null;
    elapsedRef.current = 0;
    update((s) => ({ ...s, playing: false, index: 0 }));
  }, [update]);

  const toggle = useCallback(() => {
    if (mode === 'step') next();
    else if (playing) pause();
    else play();
  }, [mode, playing, next, pause, play]);

  const elapsed = useCallback(
    () => elapsedRef.current + (startedRef.current !== null ? performance.now() - startedRef.current : 0),
    [],
  );

  return {
    index,
    last,
    playing,
    finished: index >= last,
    play,
    pause,
    toggle,
    next,
    prev,
    seek,
    restart,
    elapsed,
  };
}
