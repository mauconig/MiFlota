import type { ChangeEvent, CSSProperties } from 'react';
import { SearchIcon } from '../icons';

export function SearchBar({ value, onChange, placeholder, style }: { value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; placeholder: string; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        border: '1px solid #e0d6c4',
        borderRadius: 12,
        minHeight: 34,
        padding: '0 12px',
        background: '#fffdf8',
        flex: 'none',
        width: 210,
        ...style,
      }}
    >
      <span style={{ color: '#8f8a80', display: 'flex', flex: 'none' }}>
        <SearchIcon size={14} />
      </span>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: '#1a1a18' }}
      />
    </span>
  );
}
