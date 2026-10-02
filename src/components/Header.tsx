import type { Theme } from '../hooks/useTheme';
import { Icon } from './Icon';

export type View = 'lab' | 'compare';

interface HeaderProps {
  view: View;
  onView: (view: View) => void;
  educational: boolean;
  onEducational: (value: boolean) => void;
  theme: Theme;
  onTheme: (theme: Theme) => void;
  onHelp: () => void;
}

function Logo() {
  return (
    <svg className="brand__logo" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect x="2" y="4" width="36" height="4" rx="1.5" className="brand__rail" />
      <line x1="13" y1="8" x2="13" y2="17" className="brand__cable" />
      <line x1="27" y1="8" x2="27" y2="13" className="brand__cable" />
      <path d="M9 17h8M9 17v3M17 17v3" className="brand__claw" />
      <path d="M23 13h8M23 13v3M31 13v3" className="brand__claw" />
      <rect x="10" y="20" width="6" height="16" rx="1.5" className="brand__box brand__box--a" />
      <rect x="24" y="16" width="6" height="20" rx="1.5" className="brand__box brand__box--b" />
      <rect x="17" y="28" width="6" height="8" rx="1.5" className="brand__box" />
      <rect x="3" y="30" width="6" height="6" rx="1.5" className="brand__box" />
      <rect x="31" y="24" width="6" height="12" rx="1.5" className="brand__box" />
    </svg>
  );
}

export function Header({ view, onView, educational, onEducational, theme, onTheme, onHelp }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand">
        <Logo />
        <div>
          <h1 className="brand__name">
            Algorithm <span>Sorting</span> Lab
          </h1>
          <p className="brand__tagline">Laboratório visual de algoritmos de ordenação</p>
        </div>
      </div>

      <nav className="view-switch" aria-label="Modo de visualização">
        <button type="button" className={view === 'lab' ? 'is-active' : ''} aria-pressed={view === 'lab'} onClick={() => onView('lab')}>
          <Icon name="lab" size={16} /> Laboratório
        </button>
        <button
          type="button"
          className={view === 'compare' ? 'is-active' : ''}
          aria-pressed={view === 'compare'}
          onClick={() => onView('compare')}
        >
          <Icon name="compare" size={16} /> Comparar algoritmos
        </button>
      </nav>

      <div className="app-header__actions">
        <button
          type="button"
          className={`toggle ${educational ? 'is-on' : ''}`}
          aria-pressed={educational}
          aria-label="Modo Educacional"
          onClick={() => onEducational(!educational)}
          title="Mostra explicações, código, variáveis e ponteiros (E)"
        >
          <Icon name="book" size={16} />
          <span>Modo Educacional</span>
          <span className="toggle__switch" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        <button type="button" className="icon-button" onClick={onHelp} aria-label="Atalhos de teclado" title="Atalhos de teclado (?)">
          <Icon name="keyboard" />
        </button>
      </div>
    </header>
  );
}
