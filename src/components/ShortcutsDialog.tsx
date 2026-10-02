import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

const SHORTCUTS: [string, string][] = [
  ['Espaço', 'Iniciar / pausar (no modo passo a passo: próximo passo)'],
  ['→', 'Próximo passo'],
  ['←', 'Passo anterior'],
  ['Home / End', 'Ir para o início / fim da execução'],
  ['R', 'Reiniciar'],
  ['G', 'Gerar nova sequência'],
  ['E', 'Ligar/desligar o modo educacional'],
  ['F', 'Tela cheia da animação'],
  ['+ / −', 'Ampliar / reduzir as caixas'],
  ['?', 'Mostrar esta ajuda'],
];

interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="shortcuts-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog__content">
        <header className="dialog__header">
          <h2 id="shortcuts-title">Atalhos de teclado</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </header>
        <table className="shortcuts">
          <tbody>
            {SHORTCUTS.map(([key, action]) => (
              <tr key={key}>
                <th scope="row">
                  {key.split(' / ').map((k, i) => (
                    <span key={k}>
                      {i > 0 && ' / '}
                      <kbd>{k}</kbd>
                    </span>
                  ))}
                </th>
                <td>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">
          Os atalhos ficam desativados enquanto você digita em um campo. Use Tab para navegar entre os controles.
        </p>
      </div>
    </dialog>
  );
}
