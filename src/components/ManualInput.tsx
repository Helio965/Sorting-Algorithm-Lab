import { useId, useState } from 'react';
import { LIMITS, parseValues } from '../utils/parseInput';
import { Icon } from './Icon';

interface ManualInputProps {
  current: readonly number[];
  onApply: (values: number[]) => void;
  onClose: () => void;
}

export function ManualInput({ current, onApply, onClose }: ManualInputProps) {
  const id = useId();
  const [text, setText] = useState(current.join(', '));
  const [error, setError] = useState<string | null>(null);

  const apply = () => {
    const result = parseValues(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onApply(result.values);
  };

  return (
    <form
      className="manual-input"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <label className="field__label" htmlFor={id}>
        Inserir valores manualmente
      </label>
      <p className="manual-input__hint" id={`${id}-hint`}>
        Entre {LIMITS.minCount} e {LIMITS.maxCount} números inteiros de {LIMITS.minValue} a {LIMITS.maxValue}, separados por
        vírgula. Exemplo: <code>12, 4, 28, 7, 15, 2, 31, 10</code>
      </p>
      <div className="manual-input__row">
        <input
          id={id}
          className={`text-input ${error ? 'text-input--error' : ''}`}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <button type="submit" className="button button--primary">
          <Icon name="check" size={16} /> Aplicar
        </button>
        <button type="button" className="button button--ghost" onClick={onClose}>
          Cancelar
        </button>
      </div>
      {error && (
        <p className="manual-input__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
