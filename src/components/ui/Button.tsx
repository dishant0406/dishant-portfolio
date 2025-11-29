'use client';

import { ButtonProps } from '@/types';

const variantStyles = {
  primary:
    'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 active:bg-gray-950 dark:active:bg-gray-300 shadow-sm',
  outline:
    'bg-transparent border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600 active:bg-gray-100 dark:active:bg-neutral-700',
  ghost:
    'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 active:bg-gray-200 dark:active:bg-neutral-700',
  icon:
    'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 active:bg-gray-200 dark:active:bg-neutral-700 p-2',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  disabled = false,
  type = 'button',
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-full
        transition-colors duration-150 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 focus:ring-offset-2 dark:focus:ring-offset-black
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${variant !== 'icon' ? sizeStyles[size] : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export default Button;
