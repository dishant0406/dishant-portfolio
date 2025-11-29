'use client';

import { IconButtonProps } from '@/types';

const sizeStyles = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const variantStyles = {
  default: 'bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700 shadow-sm',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-neutral-800',
  outline: 'bg-transparent border border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800',
};

export function IconButton({
  icon,
  onClick,
  className = '',
  size = 'md',
  variant = 'default',
  ariaLabel,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`
        inline-flex items-center justify-center
        rounded-full
        transition-colors duration-150 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:ring-offset-2 dark:focus:ring-offset-black
        text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {icon}
    </button>
  );
}

export default IconButton;
