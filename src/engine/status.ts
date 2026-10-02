import type { Frame } from './types';

export type StatusKind =
  | 'ready'
  | 'compare'
  | 'swap'
  | 'pivot'
  | 'sorted'
  | 'held'
  | 'move'
  | 'call'
  | 'partition'
  | 'info'
  | 'done';

export interface Status {
  kind: StatusKind;
  label: string;
}

/** Rótulo textual do estado atual (não depende apenas de cor). */
export function frameStatus(frame: Frame): Status {
  const action = frame.action;
  switch (action.type) {
    case 'start':
      return { kind: 'ready', label: 'PRONTO' };
    case 'compare':
      return { kind: 'compare', label: 'COMPARANDO' };
    case 'swap':
      return { kind: 'swap', label: 'TROCANDO' };
    case 'pivot':
      return { kind: 'pivot', label: 'PIVÔ ESCOLHIDO' };
    case 'sorted':
      return { kind: 'sorted', label: 'POSIÇÃO FINAL' };
    case 'lift':
      return { kind: 'held', label: 'SEGURANDO A CHAVE' };
    case 'shift':
      return { kind: 'move', label: 'DESLOCANDO' };
    case 'drop':
      return { kind: 'held', label: 'INSERINDO' };
    case 'copy-to-aux':
      return { kind: 'move', label: 'COPIANDO P/ AUXILIAR' };
    case 'write-from-aux':
      return { kind: 'move', label: 'MESCLANDO' };
    case 'call':
      return { kind: 'call', label: 'CHAMADA RECURSIVA' };
    case 'partition':
      return { kind: 'partition', label: 'PARTIÇÃO CONCLUÍDA' };
    case 'pass':
      return { kind: 'info', label: `PASSADA ${action.number}` };
    case 'note':
      switch (action.tone) {
        case 'pointer':
          return { kind: 'info', label: 'PONTEIRO' };
        case 'phase':
          return { kind: 'call', label: 'NOVA FASE' };
        case 'base':
          return { kind: 'call', label: 'CASO BASE' };
        case 'merged':
          return { kind: 'sorted', label: 'MESCLA CONCLUÍDA' };
        case 'check':
          return { kind: 'info', label: 'VERIFICAÇÃO' };
        case 'skip':
          return { kind: 'info', label: 'SEM TROCA' };
        case 'heapify':
          return { kind: 'call', label: 'AJUSTE DO HEAP' };
        default:
          return { kind: 'info', label: 'INFORMAÇÃO' };
      }
    case 'done':
      return { kind: 'done', label: 'ORDENADO' };
  }
}
