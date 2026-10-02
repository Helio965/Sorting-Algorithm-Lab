import { useCallback, useState } from 'react';

function read<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Estado que lembra a preferência do usuário (tema, velocidade...) no
 * navegador. Se o armazenamento estiver indisponível, funciona normalmente
 * sem persistir.
 */
export function usePersistentState<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, fallback, validate));
  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // armazenamento indisponível (modo privado, bloqueio...): ignora
      }
    },
    [key],
  );
  return [value, update];
}

export const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
