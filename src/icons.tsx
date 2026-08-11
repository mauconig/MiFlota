export const BRANDS: Record<string, string[]> = {
  // Las tres elipses del emblema: la exterior ancha, la vertical arriba y la
  // horizontal abajo, cruzándose para formar la T. Todas centradas en 12,12.
  Toyota: [
    'M1 12a11 7.6 0 1 0 22 0a11 7.6 0 1 0 -22 0',
    'M9.1 9.8a2.9 4.5 0 1 0 5.8 0a2.9 4.5 0 1 0 -5.8 0',
    'M5.2 14.3a6.8 2.8 0 1 0 13.6 0a6.8 2.8 0 1 0 -13.6 0',
  ],
  Nissan: ['M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0 -18', 'M3.3 9.7h17.4', 'M3.3 14.3h17.4'],
  Chevrolet: ['M2 9.6h7.4V7h5.2v2.6H22v4.8h-7.4V17H9.4v-2.6H2z'],
  Honda: ['M4.6 6.6h14.8l-1 10.8H5.6z', 'M9.6 9.2v5.6', 'M14.4 9.2v5.6', 'M9.6 12h4.8'],
  Hyundai: [
    'M2 12a10 6.4 0 1 0 20 0a10 6.4 0 1 0 -20 0',
    'M9.9 8.4L8.7 15.6',
    'M15.3 8.4L14.1 15.6',
    'M9 12h6',
  ],
  Kia: ['M5.4 8v8', 'M5.4 12L8.9 8', 'M5.4 12L8.9 16', 'M11.4 8L10.6 16', 'M13.8 16L16.6 8L18.6 16', 'M14.9 13.6h3'],
};

export function brandOf(model: string): string[] {
  return BRANDS[String(model).split(' ')[0]] || BRANDS.Toyota;
}

export function BrandIcon({ model, size = 21 }: { model: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      {brandOf(model).map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

export function IconPath({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d={d} />
    </svg>
  );
}

export const NAV_ICONS: Record<string, string> = {
  resumen: 'm3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  flota:
    'M5 17h14M7 17a2 2 0 1 0 0-4 2 2 0 0 0 0 4m10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4M4 13l2-5h12l2 5',
  choferes: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21c0-4 3.6-6 8-6s8 2 8 6',
  alertas:
    'M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
  cobros:
    'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
  reportes:
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8',
};

export function GpsIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function ChevronIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#8f8a80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function EyeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function WarningIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" />
    </svg>
  );
}

export function ClockIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

export function TruckLogo({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H8.5c-.6 0-1.2.3-1.6.8L4.5 10.6c-.9.2-1.5 1-1.5 1.9v3.5c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}
