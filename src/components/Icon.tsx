const PATHS = {
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  next: 'M6 5.5v13l9-6.5zM16 5h2.5v14H16z',
  prev: 'M18 5.5v13L9 12zM5.5 5H8v14H5.5z',
  restart: 'M12 5a7 7 0 1 1-6.62 4.73l1.9.64A5 5 0 1 0 12 7v3L7.5 6 12 2z',
  shuffle:
    'M16 4l4 4-4 4V9h-1.6l-2.8 3.2-1.3-1.5L13.5 7H16zM4 7h3.5l7.4 10H16v-3l4 4-4 4v-3h-2.6L6 9H4zM4 15h2l1.6-1.8 1.3 1.5L7 17H4z',
  edit: 'M4 17.25V20h2.75L17.8 8.94l-2.75-2.75zM20.7 6.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.13 1.13 2.75 2.75z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5 1.2 3h-2.4zm0 20-1.2-3h2.4zM2 12l3-1.2v2.4zm20 0-3 1.2v-2.4zM4.9 4.9l3 1.3-1.7 1.7zm14.2 14.2-3-1.3 1.7-1.7zM4.9 19.1l1.3-3 1.7 1.7zM19.1 4.9l-1.3 3-1.7-1.7z',
  moon: 'M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3z',
  keyboard:
    'M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm2 3v2h2V9zm4 0v2h2V9zm4 0v2h2V9zm4 0v2h2V9zM7 14v2h10v-2z',
  fullscreen: 'M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z',
  download: 'M11 4h2v8.2l3.1-3.1 1.4 1.4L12 16l-5.5-5.5 1.4-1.4 3.1 3.1zM5 18h14v2H5z',
  zoomIn: 'M10 3a7 7 0 0 1 5.6 11.2l5 5-1.4 1.4-5-5A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM9 7h2v2h2v2h-2v2H9v-2H7V9h2z',
  zoomOut: 'M10 3a7 7 0 0 1 5.6 11.2l5 5-1.4 1.4-5-5A7 7 0 1 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM7 9h6v2H7z',
  fit: 'M3 12l4-4v3h10V8l4 4-4 4v-3H7v3z',
  book: 'M5 4h6a3 3 0 0 1 1 .2A3 3 0 0 1 13 4h6v15h-6a2 2 0 0 0-1 .3 2 2 0 0 0-1-.3H5zm2 2v11h4l.5.1V7a1 1 0 0 0-1-1zm6.5 1v10.1L14 17h3V6h-2.5a1 1 0 0 0-1 1z',
  compare: 'M4 5h7v14H4zm2 2v10h3V7zm7-2h7v14h-7zm2 2v10h3V7z',
  lab: 'M9 3h6v2h-1v4.3l5.4 9.2A1.7 1.7 0 0 1 17.9 21H6.1a1.7 1.7 0 0 1-1.5-2.5L10 9.3V5H9zm3 7.6L8.9 16h6.2z',
  close: 'M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4z',
  minus: 'M5 11h14v2H5z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  copy: 'M8 3h11a1 1 0 0 1 1 1v13h-2V5H8zM4 7h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm1 2v10h9V9z',
  check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z',
  first: 'M6 5h2.5v14H6zm3.5 7 9-6.5v13z',
  end: 'M15.5 5H18v14h-2.5zm-1 7-9 6.5v-13z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
