import { useEffect } from 'react';
import { usePersistentState } from './usePersistentState';

export type Theme = 'dark' | 'light';

const isTheme = (value: unknown): value is Theme => value === 'dark' || value === 'light';

function systemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = usePersistentState<Theme>('asl:theme', systemTheme(), isTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#061024' : '#eef4fb');
  }, [theme]);
  return [theme, setTheme];
}
