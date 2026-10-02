import { useEffect, useRef } from 'react';

export type ShortcutMap = Partial<Record<string, (event: KeyboardEvent) => void>>;

const INTERACTIVE = 'input, textarea, select, [contenteditable="true"], [role="slider"]';

/**
 * Atalhos globais de teclado. São ignorados quando o foco está em campos de
 * texto/seleção (para não conflitar com a digitação), quando há
 * modificadores (Ctrl, Alt, Cmd) ou dentro de diálogos.
 *
 * Teclas: nomes de `event.key` em minúsculas (" " para espaço, "arrowright"...).
 */
export function useKeyboardShortcuts(map: ShortcutMap, enabled = true): void {
  const ref = useRef(map);
  useEffect(() => {
    ref.current = map;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(INTERACTIVE) || target?.closest?.('dialog')) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key.toLowerCase();
      // Espaço/Enter em botões continuam acionando o próprio botão.
      if ((key === ' ' || key === 'enter') && target?.closest?.('button, a, summary')) return;
      const handler = ref.current[key];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
