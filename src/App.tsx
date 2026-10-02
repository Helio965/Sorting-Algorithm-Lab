import { useCallback, useState } from 'react';
import { getAlgorithm, isAlgorithmId, type AlgorithmId } from './algorithms';
import { ComparisonView } from './components/ComparisonView';
import { ControlPanel, type DataSource } from './components/ControlPanel';
import { Header, type View } from './components/Header';
import { LabView } from './components/LabView';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { SPEEDS } from './engine/timing';
import { isBoolean, usePersistentState } from './hooks/usePersistentState';
import type { PlayMode } from './hooks/usePlayer';
import { useTheme } from './hooks/useTheme';
import { clampCount, LIMITS } from './utils/parseInput';
import { generateValues, type Preset } from './utils/random';

const DEFAULT_COUNT = 8;

const isSpeed = (value: unknown): value is number => typeof value === 'number' && (SPEEDS as readonly number[]).includes(value);
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= LIMITS.minCount && value <= LIMITS.maxCount;

export default function App() {
  const [theme, setTheme] = useTheme();
  const [view, setView] = useState<View>('lab');
  const [algorithmId, setAlgorithmId] = usePersistentState<AlgorithmId>('asl:algorithm', 'bubble', isAlgorithmId);
  const [compareIds, setCompareIds] = useState<[AlgorithmId, AlgorithmId]>(['bubble', 'quick']);
  const [count, setCount] = usePersistentState<number>('asl:count', DEFAULT_COUNT, isCount);
  const [speed, setSpeed] = usePersistentState<number>('asl:speed', 1, isSpeed);
  const [educational, setEducational] = usePersistentState<boolean>('asl:educational', true, isBoolean);
  const [mode, setMode] = useState<PlayMode>('auto');
  const [source, setSource] = useState<DataSource>('random');
  const [values, setValues] = useState<number[]>(() => generateValues(count, 'random'));
  const [helpOpen, setHelpOpen] = useState(false);

  // Cada nova sequência é um novo array: a execução anterior é descartada e a
  // visualização reinicia do zero (sem timers, métricas ou estados antigos).
  const regenerate = useCallback((n: number, preset: DataSource) => {
    const p: Preset = preset === 'manual' ? 'random' : preset;
    setSource(p);
    setValues(generateValues(n, p));
  }, []);

  const handleCount = (n: number) => {
    const next = clampCount(n);
    setCount(next);
    regenerate(next, source);
  };

  const handleGenerate = useCallback(() => regenerate(count, source), [regenerate, count, source]);

  const handleManual = (manual: number[]) => {
    setSource('manual');
    setCount(manual.length);
    setValues(manual);
  };

  const algorithm = getAlgorithm(algorithmId);
  const shortcutsEnabled = !helpOpen;

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Pular para a animação
      </a>
      <Header
        view={view}
        onView={setView}
        educational={educational}
        onEducational={setEducational}
        theme={theme}
        onTheme={setTheme}
        onHelp={() => setHelpOpen(true)}
      />

      <main id="main" className="app-main" tabIndex={-1}>
        <ControlPanel
          showAlgorithm={view === 'lab'}
          algorithmId={algorithmId}
          onAlgorithm={setAlgorithmId}
          count={count}
          onCount={handleCount}
          source={source}
          onPreset={(preset) => regenerate(count, preset)}
          onGenerate={handleGenerate}
          values={values}
          onManual={handleManual}
          speed={speed}
          onSpeed={setSpeed}
          mode={mode}
          onMode={setMode}
        />

        {view === 'lab' ? (
          <LabView
            key="lab"
            algorithm={algorithm}
            values={values}
            speed={speed}
            mode={mode}
            educational={educational}
            onToggleEducational={() => setEducational(!educational)}
            onGenerate={handleGenerate}
            shortcutsEnabled={shortcutsEnabled}
            onHelp={() => setHelpOpen(true)}
          />
        ) : (
          <ComparisonView
            key="compare"
            values={values}
            ids={compareIds}
            onIds={setCompareIds}
            speed={speed}
            mode={mode}
            educational={educational}
            onGenerate={handleGenerate}
            shortcutsEnabled={shortcutsEnabled}
            onHelp={() => setHelpOpen(true)}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Algorithm Sorting Lab · projeto educacional open source (MIT). Cada animação é gerada pela execução real do
          algoritmo escolhido.
        </p>
      </footer>

      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
