export function formatSeconds(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}s`;
}

export function formatSpeed(speed: number): string {
  return `${speed}x`;
}

export function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}
