import { forwardRef, useState } from 'react';
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';

interface BtnProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  style: CSSProperties;
  hoverStyle?: CSSProperties;
  children?: ReactNode;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn({ onClick, style, hoverStyle, children, ariaLabel, type = 'button' }, ref) {
  const [hover, setHover] = useState(false);
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={ariaLabel}
      style={{ ...style, ...(hover && hoverStyle ? hoverStyle : null) }}
    >
      {children}
    </button>
  );
});
