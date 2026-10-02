import { useEffect, useState, type CSSProperties } from 'react';
import type { Milestone } from '../engine/types';
import type { Player, PlayMode } from '../hooks/usePlayer';
import { formatSeconds } from '../utils/format';
import { Icon } from './Icon';

/** Cronômetro isolado: só ele re-renderiza enquanto a animação toca. */
export function ElapsedTimer({ elapsed, playing }: { elapsed: () => number; playing: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!playing) {
      setTick((t) => t + 1);
      return undefined;
    }
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, [playing, elapsed]);
  return <>{formatSeconds(elapsed())}</>;
}

interface TimelineProps {
  index: number;
  last: number;
  milestones: readonly Milestone[];
  onSeek: (index: number) => void;
}

export function Timeline({ index, last, milestones, onSeek }: TimelineProps) {
  const progress = last > 0 ? (index / last) * 100 : 0;
  const showDots = last > 0 && last <= 40;
  const pct = (step: number) => (last > 0 ? (step / last) * 100 : 0);
  return (
    <div className="timeline" style={{ '--progress': `${progress}%` } as CSSProperties}>
      <div className="timeline__track" aria-hidden="true">
        {showDots
          ? Array.from({ length: last + 1 }, (_, step) => (
              <span key={step} className={`timeline__dot ${step <= index ? 'is-done' : ''} ${step === index ? 'is-current' : ''}`} style={{ left: `${pct(step)}%` }} />
            ))
          : milestones.map((m) => (
              <span
                key={`${m.step}-${m.label}`}
                className={`timeline__tick ${m.step <= index ? 'is-done' : ''}`}
                style={{ left: `${pct(m.step)}%` }}
                title={`Passo ${m.step}: ${m.label}`}
              />
            ))}
      </div>
      <input
        className="timeline__input"
        type="range"
        min={0}
        max={Math.max(last, 1)}
        step={1}
        value={index}
        disabled={last === 0}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Linha do tempo da execução"
        aria-valuetext={`Passo ${index} de ${last}`}
      />
    </div>
  );
}

interface PlaybackBarProps {
  player: Player;
  mode: PlayMode;
  milestones: readonly Milestone[];
}

export function PlaybackBar({ player, mode, milestones }: PlaybackBarProps) {
  const { index, last, playing, finished } = player;

  let primary: { label: string; icon: 'play' | 'pause' | 'next' | 'restart'; action: () => void; hint: string };
  if (mode === 'step') primary = { label: 'Próximo passo', icon: 'next', action: player.next, hint: 'Executa uma única operação (→ ou Espaço)' };
  else if (playing) primary = { label: 'Pausar', icon: 'pause', action: player.pause, hint: 'Pausar (Espaço)' };
  else if (finished) primary = { label: 'Repetir', icon: 'restart', action: player.play, hint: 'Executar novamente desde o início' };
  else if (index === 0) primary = { label: 'Iniciar', icon: 'play', action: player.play, hint: 'Iniciar (Espaço)' };
  else primary = { label: 'Continuar', icon: 'play', action: player.play, hint: 'Continuar (Espaço)' };

  return (
    <section className="playback" aria-label="Controles de execução">
      <div className="playback__buttons">
        <button type="button" className="icon-button icon-button--lg" onClick={player.prev} disabled={index === 0} aria-label="Passo anterior" title="Passo anterior (←)">
          <Icon name="prev" />
        </button>
        <button
          type="button"
          className={`button button--primary playback__main ${playing ? 'is-playing' : ''}`}
          onClick={primary.action}
          disabled={mode === 'step' && finished}
          title={primary.hint}
        >
          <Icon name={primary.icon} /> {primary.label}
        </button>
        {mode === 'auto' && (
          <button type="button" className="icon-button icon-button--lg" onClick={player.next} disabled={finished} aria-label="Próximo passo" title="Próximo passo (→)">
            <Icon name="next" />
          </button>
        )}
        <button type="button" className="icon-button icon-button--lg" onClick={player.restart} disabled={index === 0 && !playing} aria-label="Reiniciar" title="Reiniciar (R)">
          <Icon name="restart" />
        </button>
      </div>
      <Timeline index={index} last={last} milestones={milestones} onSeek={player.seek} />
      <div className="playback__status" aria-live="off">
        <span className="playback__step">
          Passo <strong>{index}</strong>
          <span className="muted"> / {last}</span>
        </span>
        <span className="playback__time" title="Tempo de animação">
          ⏱ <ElapsedTimer elapsed={player.elapsed} playing={playing} />
        </span>
      </div>
    </section>
  );
}
