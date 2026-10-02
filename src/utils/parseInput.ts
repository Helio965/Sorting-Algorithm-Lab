export const LIMITS = {
  minCount: 3,
  maxCount: 50,
  minValue: -999,
  maxValue: 999,
} as const;

export type ParseResult = { ok: true; values: number[] } | { ok: false; error: string };

const INTEGER = /^[+-]?\d+$/;

/**
 * Converte o texto digitado pelo usuário em uma lista de inteiros.
 * Aceita vírgulas, ponto e vírgula, espaços ou quebras de linha como separadores.
 */
export function parseValues(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Digite pelo menos 3 números separados por vírgula.' };

  const tokens = trimmed.split(/\s*[,;]\s*|\s+/);
  const values: number[] = [];

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token === '') {
      return { ok: false, error: `Há um valor vazio na posição ${index + 1} (verifique vírgulas repetidas).` };
    }
    if (!INTEGER.test(token)) {
      if (/^[+-]?\d*\.\d+$/.test(token)) {
        return { ok: false, error: `"${token}" não é inteiro. Use apenas números inteiros.` };
      }
      return { ok: false, error: `"${token}" não é um número válido.` };
    }
    const value = Number(token);
    if (!Number.isSafeInteger(value) || value < LIMITS.minValue || value > LIMITS.maxValue) {
      return {
        ok: false,
        error: `${token} está fora do intervalo permitido (${LIMITS.minValue} a ${LIMITS.maxValue}).`,
      };
    }
    values.push(value);
  }

  if (values.length < LIMITS.minCount) {
    return { ok: false, error: `Informe pelo menos ${LIMITS.minCount} números (você informou ${values.length}).` };
  }
  if (values.length > LIMITS.maxCount) {
    return { ok: false, error: `Informe no máximo ${LIMITS.maxCount} números (você informou ${values.length}).` };
  }
  return { ok: true, values };
}

export function clampCount(value: number): number {
  if (!Number.isFinite(value)) return LIMITS.minCount;
  return Math.min(LIMITS.maxCount, Math.max(LIMITS.minCount, Math.round(value)));
}
