import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AlgorithmDefinition } from '../algorithms/types';
import { runAlgorithm } from '../engine/run';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { usePlayer, type PlayMode } from '../hooks/usePlayer';
import { exportCsv, exportJson } from '../utils/export';
import { formatNumber } from '../utils/format';
import { HeapTree } from '../visualization/HeapTree';
import { RecursionTree } from '../visualization/RecursionTree';
import { Stage } from '../visualization/Stage';
import { AlgorithmInfo } from './AlgorithmInfo';
import { CodePanel } from './CodePanel';
import { ExplanationPanel, StatusChip } from './ExplanationPanel';
import { HistoryPanel } from './HistoryPanel';
import { Icon } from './Icon';
import { Legend } from './Legend';
import { MetricsPanel } from './MetricsPanel';
import { PlaybackBar } from './PlaybackBar';

interface LabViewProps {
  algorithm: AlgorithmDefinition;
  values: readonly number[];
  speed: number;
  mode: PlayMode;
  educational: boolean;
  onToggleEducational: () => void;
  onGenerate: () => void;
  shortcutsEnabled: boolean;
  onHelp: () => void;
}

const ZOOMS = [1, 1.25, 1.5, 2, 2.5, 3];

export function LabView({ algorithm, values, speed, mode, educational, onToggleEducational, onGenerate, shortcutsEnabled, onHelp }: LabViewProps) {
  const trace = useMemo(() => runAlgorithm(algorithm, values), [algorithm, values]);
  const player = usePlayer(trace.frames, { speed, mode });
  const frame = trace.frames[player.index];

  const [zoomIndex, setZoomIndex] = useState(0);
  const zoomIn = useCallback(() => setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1)), []);
  const zoomOut = useCallback(() => setZoomIndex((z) => Math.max(0, z - 1)), []);

  // Tela cheia da área de animação (modo apresentação).
  const stageRef = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current && stageRef.current !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void el.requestFullscreen?.().catch(() => undefined);
  }, []);
  const canFullscreen = typeof document !== 'undefined' && document.fullscreenEnabled;

  useKeyboardShortcuts(
    {
      ' ': () => player.toggle(),
      arrowright: () => player.next(),
      arrowleft: () => player.prev(),
      home: () => player.seek(0),
      end: () => player.seek(player.last),
      r: () => player.restart(),
      g: () => onGenerate(),
      e: () => onToggleEducational(),
      f: () => toggleFullscreen(),
      '+': zoomIn,
      '=': zoomIn,
      '-': zoomOut,
      '?': () => onHelp(),
    },
    shortcutsEnabled,
  );

  const m = frame.metrics;
  const c = algorithm.complexity;

  return (
    <div className="lab">
      <section ref={stageRef} className={`panel stage-panel ${fullscreen ? 'is-fullscreen' : ''}`} aria-labelledby="stage-title">
        <header className="stage-panel__header">
          <div className="stage-panel__title">
            <h2 id="stage-title">{algorithm.name}</h2>
            <span>{algorithm.tagline}</span>
          </div>
          <StatusChip frame={frame} />
          <dl className="stage-panel__counters">
            <div>
              <dt>Comparações</dt>
              <dd key={m.comparisons}>{formatNumber(m.comparisons)}</dd>
            </div>
            <div>
              <dt>Trocas</dt>
              <dd key={m.swaps}>{formatNumber(m.swaps)}</dd>
            </div>
          </dl>
          <div className="stage-panel__tools" role="group" aria-label="Zoom e tela cheia">
            <button type="button" className="icon-button icon-button--sm" onClick={zoomOut} disabled={zoomIndex === 0} aria-label="Reduzir caixas" title="Reduzir (−)">
              <Icon name="zoomOut" size={16} />
            </button>
            <button
              type="button"
              className="icon-button icon-button--sm"
              onClick={() => setZoomIndex(0)}
              disabled={zoomIndex === 0}
              aria-label="Ajustar à largura"
              title="Ajustar à largura"
            >
              <Icon name="fit" size={16} />
            </button>
            <button
              type="button"
              className="icon-button icon-button--sm"
              onClick={zoomIn}
              disabled={zoomIndex === ZOOMS.length - 1}
              aria-label="Ampliar caixas"
              title="Ampliar (+)"
            >
              <Icon name="zoomIn" size={16} />
            </button>
            {canFullscreen && (
              <button
                type="button"
                className={`icon-button icon-button--sm ${fullscreen ? 'is-active' : ''}`}
                onClick={toggleFullscreen}
                aria-pressed={fullscreen}
                aria-label="Tela cheia"
                title="Tela cheia / apresentação (F)"
              >
                <Icon name="fullscreen" size={16} />
              </button>
            )}
          </div>
        </header>

        {frame.step === 0 && (
          <p className="stage-panel__intro">
            <span>
              <strong>{algorithm.name}:</strong> {algorithm.description}
            </span>
            <span className="stage-panel__complexity">
              Melhor <b>{c.best}</b> · Médio <b>{c.average}</b> · Pior <b>{c.worst}</b> · Memória <b>{c.space}</b>
            </span>
          </p>
        )}

        <Stage
          trace={trace}
          frame={frame}
          speed={speed}
          educational={educational}
          usesAux={algorithm.usesAux}
          zoom={ZOOMS[zoomIndex]}
          fullHeight={fullscreen}
        />
        {educational && <Legend showRanges={algorithm.recursive} />}
        {fullscreen && <p className="stage-panel__caption">{frame.message}</p>}
        <PlaybackBar player={player} mode={mode} milestones={trace.milestones} />
      </section>

      {educational && (
        <div className="lab__study">
          <CodePanel title={`${algorithm.id}Sort.js`} code={algorithm.code} line={frame.line} annotation={frame.annotation} />
          <ExplanationPanel algorithm={algorithm} trace={trace} frame={frame} educational={educational} announce={!player.playing} />
        </div>
      )}

      <MetricsPanel
        algorithm={algorithm}
        frame={frame}
        last={player.last}
        elapsed={player.elapsed}
        playing={player.playing}
        onExportJson={() => exportJson(algorithm, trace)}
        onExportCsv={() => exportCsv(algorithm, trace)}
      />

      {educational && (
        <div className="lab__extras">
          <HistoryPanel frames={trace.frames} index={player.index} onSeek={player.seek} />
          {algorithm.recursive && <RecursionTree trace={trace} frame={frame} onSeek={player.seek} />}
          {algorithm.id === 'heap' && <HeapTree trace={trace} frame={frame} />}
          <AlgorithmInfo algorithm={algorithm} n={values.length} />
        </div>
      )}
    </div>
  );
}
