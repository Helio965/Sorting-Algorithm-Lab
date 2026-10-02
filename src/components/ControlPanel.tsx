import { useId, useState } from 'react';
import { ALGORITHMS, type AlgorithmId } from '../algorithms';
import type { PlayMode } from '../hooks/usePlayer';
import { SPEEDS } from '../engine/timing';
import { PRESETS, type Preset } from '../utils/random';
import { CountControl } from './CountControl';
import { Icon } from './Icon';
import { ManualInput } from './ManualInput';
import { Segmented } from './Segmented';

export type DataSource = Preset | 'manual';

interface ControlPanelProps {
  showAlgorithm: boolean;
  algorithmId: AlgorithmId;
  onAlgorithm: (id: AlgorithmId) => void;
  count: number;
  onCount: (count: number) => void;
  source: DataSource;
  onPreset: (preset: Preset) => void;
  onGenerate: () => void;
  values: readonly number[];
  onManual: (values: number[]) => void;
  speed: number;
  onSpeed: (speed: number) => void;
  mode: PlayMode;
  onMode: (mode: PlayMode) => void;
}

export function ControlPanel(props: ControlPanelProps) {
  const algorithmSelect = useId();
  const presetSelect = useId();
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <section className="panel controls" aria-label="Configuração da execução">
      <div className="controls__grid">
        {props.showAlgorithm && (
          <div className="field">
            <label className="field__label" htmlFor={algorithmSelect}>
              Algoritmo
            </label>
            <select
              id={algorithmSelect}
              className="select"
              value={props.algorithmId}
              onChange={(e) => props.onAlgorithm(e.target.value as AlgorithmId)}
            >
              {ALGORITHMS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <CountControl value={props.count} onChange={props.onCount} />

        <div className="field controls__sequence">
          <label className="field__label" htmlFor={presetSelect}>
            Sequência
          </label>
          <div className="field__row">
            <select
              id={presetSelect}
              className="select"
              value={props.source}
              onChange={(e) => {
                if (e.target.value === 'manual') setManualOpen(true);
                else props.onPreset(e.target.value as Preset);
              }}
            >
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id} title={p.hint}>
                  {p.label}
                </option>
              ))}
              <option value="manual">Manual…</option>
            </select>
            <button type="button" className="button button--primary" onClick={props.onGenerate} title="Gerar nova sequência (G)">
              <Icon name="shuffle" size={16} /> Gerar números
            </button>
            <button
              type="button"
              className={`icon-button ${manualOpen ? 'is-active' : ''}`}
              onClick={() => setManualOpen((open) => !open)}
              aria-expanded={manualOpen}
              aria-label="Inserir valores manualmente"
              title="Inserir valores manualmente"
            >
              <Icon name="edit" size={16} />
            </button>
          </div>
        </div>

        <Segmented
          label="Velocidade"
          value={props.speed}
          options={SPEEDS.map((s) => ({ value: s, label: `${s}x`, title: `Velocidade ${s}x` }))}
          onChange={props.onSpeed}
        />

        <Segmented<PlayMode>
          label="Modo de execução"
          value={props.mode}
          options={[
            { value: 'auto', label: 'Automático', title: 'Executa continuamente' },
            { value: 'step', label: 'Passo a passo', title: 'Avança apenas quando você clicar' },
          ]}
          onChange={props.onMode}
        />
      </div>

      {manualOpen && (
        <ManualInput
          current={props.values}
          onApply={(values) => {
            props.onManual(values);
            setManualOpen(false);
          }}
          onClose={() => setManualOpen(false)}
        />
      )}
    </section>
  );
}
