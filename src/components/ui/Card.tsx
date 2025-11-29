'use client';

import { CardProps } from '@/types';

const paddingStyles = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-5 lg:p-6',
  lg: 'p-6 sm:p-7 lg:p-8',
};

export function Card({
  children,
  className = '',
  padding = 'md',
  hover = true,
  onClick,
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`
        bg-white/90 dark:bg-neutral-900/90
        backdrop-blur-sm
        border border-gray-100 dark:border-neutral-800
        rounded-xl lg:rounded-2xl
        shadow-sm
        ${hover ? 'hover:shadow-md hover:bg-white dark:hover:bg-neutral-800/90 transition-all duration-200' : ''}
        ${onClick ? 'cursor-pointer text-left w-full' : ''}
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </Component>
  );
}

export default Card;
