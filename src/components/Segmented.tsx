import { useId } from 'react';

interface Option<T extends string | number> {
  value: T;
  label: string;
  title?: string;
}

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}

/** Grupo de opções exclusivas (rádios nativos, navegáveis por setas). */
export function Segmented<T extends string | number>({ label, value, options, onChange, hideLabel }: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className="segmented">
      <legend className={hideLabel ? 'sr-only' : 'field__label'}>{label}</legend>
      <div className="segmented__options">
        {options.map((option) => (
          <label key={String(option.value)} className="segmented__option" title={option.title}>
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
