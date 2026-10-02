import { useEffect, useId, useState } from 'react';
import { clampCount, LIMITS } from '../utils/parseInput';
import { Icon } from './Icon';

interface CountControlProps {
  value: number;
  onChange: (value: number) => void;
}

export function CountControl({ value, onChange }: CountControlProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = (raw: string) => {
    const parsed = clampCount(Number(raw));
    setDraft(String(parsed));
    if (parsed !== value) onChange(parsed);
  };

  return (
    <div className="field count-control">
      <label className="field__label" htmlFor={id}>
        Quantidade de elementos
      </label>
      <div className="count-control__row">
        <button
          type="button"
          className="icon-button"
          onClick={() => onChange(clampCount(value - 1))}
          disabled={value <= LIMITS.minCount}
          aria-label="Diminuir quantidade"
          title="Diminuir"
        >
          <Icon name="minus" size={16} />
        </button>
        <input
          id={id}
          className="count-control__input"
          type="number"
          inputMode="numeric"
          min={LIMITS.minCount}
          max={LIMITS.maxCount}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit((e.target as HTMLInputElement).value);
          }}
        />
        <button
          type="button"
          className="icon-button"
          onClick={() => onChange(clampCount(value + 1))}
          disabled={value >= LIMITS.maxCount}
          aria-label="Aumentar quantidade"
          title="Aumentar"
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
      <input
        className="range"
        type="range"
        min={LIMITS.minCount}
        max={LIMITS.maxCount}
        value={value}
        onChange={(e) => onChange(clampCount(Number(e.target.value)))}
        aria-label={`Quantidade de elementos: ${value} (de ${LIMITS.minCount} a ${LIMITS.maxCount})`}
      />
    </div>
  );
}
