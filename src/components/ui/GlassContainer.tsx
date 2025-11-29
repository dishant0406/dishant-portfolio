'use client';

import { GlassContainerProps } from '@/types';

export function GlassContainer({
  children,
  className = '',
  blur = 'md',
}: GlassContainerProps) {
  return (
    <div
      className={`
        glass-container
        rounded-2xl lg:rounded-3xl
        overflow-hidden
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default GlassContainer;
