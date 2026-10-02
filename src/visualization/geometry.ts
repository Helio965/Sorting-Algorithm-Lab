/**
 * Cálculo do layout da área de animação.
 *
 * Tudo é derivado da quantidade de elementos e da largura disponível: com
 * poucos elementos as caixas ficam largas; com muitos, ficam estreitas e,
 * abaixo do tamanho mínimo, a área passa a rolar horizontalmente.
 */

export interface GeometryInput {
  n: number;
  /** Valores de todos os elementos (por id) — definem as alturas. */
  values: readonly number[];
  containerWidth: number;
  /** 1 = ajustar à largura; valores maiores ampliam as caixas. */
  zoom: number;
  usesAux: boolean;
  educational: boolean;
  /** Altura mínima desejada (tela cheia). */
  minHeight?: number;
}

export interface Geometry {
  n: number;
  width: number;
  height: number;
  offsetX: number;
  boxW: number;
  gap: number;
  railH: number;
  clawH: number;
  clawW: number;
  carriageW: number;
  /** Linha de pega das garras quando estão recolhidas. */
  restY: number;
  floorY: number;
  trayY: number | null;
  trayTop: number | null;
  minH: number;
  maxH: number;
  vmin: number;
  vmax: number;
  fontSize: number;
  verticalLabels: boolean;
  showIndexes: boolean;
  indexEvery: number;
  bracketY: number;
  pointerY: number;
  auxPointerY: number | null;
  /** A área é mais larga que o contêiner (rolagem horizontal). */
  overflows: boolean;
}

export const MIN_BOX_W = 12;
export const MAX_FIT_BOX_W = 64;
export const MAX_BOX_W = 110;
export const POINTER_ROW_H = 17;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function computeGeometry(input: GeometryInput): Geometry {
  const n = Math.max(1, input.n);
  const containerWidth = Math.max(240, input.containerWidth);
  const sidePad = containerWidth < 520 ? 14 : 24;
  const avail = containerWidth - sidePad * 2;

  const fitW = avail / (n + (n - 1) * 0.2);
  const boxW = Math.round(clamp(clamp(fitW, MIN_BOX_W, MAX_FIT_BOX_W) * input.zoom, MIN_BOX_W, MAX_BOX_W));
  const gap = Math.round(clamp(boxW * 0.2, 2, 12));
  const rowW = n * boxW + (n - 1) * gap;
  const width = Math.max(containerWidth, Math.ceil(rowW + sidePad * 2));
  const offsetX = Math.round((width - rowW) / 2);

  const responsiveHeight = containerWidth < 520 ? 270 : containerWidth < 900 ? 320 : 370;
  const auxShare = input.usesAux ? 0.55 : 1;
  const baseHeight = Math.max(responsiveHeight, Math.min(760, Math.round((input.minHeight ?? 0) * auxShare)));
  const railH = 20;
  const clawH = 14;
  const restY = railH + clawH + 8;
  const showIndexes = input.educational;
  const labelsH = input.educational ? 20 + 12 + POINTER_ROW_H * 2 : 26;
  const floorY = baseHeight - labelsH;
  const maxH = Math.round((floorY - restY - 10) * 0.6);
  const minH = Math.max(20, Math.round(maxH * 0.2));

  let height = baseHeight;
  let trayY: number | null = null;
  let trayTop: number | null = null;
  let auxPointerY: number | null = null;
  if (input.usesAux) {
    trayTop = floorY + labelsH;
    trayY = trayTop + 18 + maxH;
    auxPointerY = trayY + 8;
    height = trayY + 8 + POINTER_ROW_H * 2 + 4;
  }

  const finite = input.values.filter(Number.isFinite);
  const vmin = finite.length ? Math.min(...finite) : 0;
  const vmax = finite.length ? Math.max(...finite) : 1;
  const digits = Math.max(...input.values.map((v) => String(v).length), 1);
  const fontSize = Math.round(clamp(boxW * (digits >= 3 ? 0.3 : 0.38), 9, 20));
  const verticalLabels = boxW < 20 && digits >= 2;

  const bracketY = floorY + (showIndexes ? 20 : 6);

  return {
    n,
    width,
    height,
    offsetX,
    boxW,
    gap,
    railH,
    clawH,
    clawW: Math.max(18, boxW + 8),
    carriageW: Math.max(16, Math.round(boxW * 0.55) + 10),
    restY,
    floorY,
    trayY,
    trayTop,
    minH,
    maxH,
    vmin,
    vmax,
    fontSize,
    verticalLabels,
    showIndexes,
    indexEvery: boxW >= 18 ? 1 : boxW >= 12 ? 5 : 10,
    bracketY,
    pointerY: bracketY + 12,
    auxPointerY,
    overflows: width > containerWidth + 1,
  };
}

export function slotX(g: Geometry, index: number): number {
  return g.offsetX + index * (g.boxW + g.gap);
}

export function slotCenter(g: Geometry, index: number): number {
  return slotX(g, index) + g.boxW / 2;
}

export function boxHeight(g: Geometry, value: number): number {
  if (g.vmax === g.vmin) return Math.round((g.minH + g.maxH) / 2);
  return Math.round(g.minH + ((value - g.vmin) / (g.vmax - g.vmin)) * (g.maxH - g.minH));
}

/** Topo de um elemento segurado pela garra (acima da fileira). */
export function heldTop(g: Geometry, height: number): number {
  return Math.max(g.restY, g.floorY - g.maxH - 10 - height);
}
