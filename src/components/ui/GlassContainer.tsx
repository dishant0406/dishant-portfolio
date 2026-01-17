'use client';

import { GlassContainerProps } from '@/types';

export function GlassContainer({
  children,
  className = '',
}: GlassContainerProps) {
  return (
    <div
      className={`
        bg-background
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
