'use client';

import { ButtonProps } from '@/types';

const variantStyles = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 shadow-sm',
  outline:
    'bg-transparent border border-border text-foreground/90 hover:bg-secondary hover:border-border/80 active:bg-secondary/70',
  ghost:
    'bg-transparent text-foreground/90 hover:bg-secondary active:bg-secondary/70',
  icon:
    'bg-transparent text-muted-foreground hover:bg-secondary active:bg-secondary/70 p-2',
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
        whitespace-nowrap
        font-medium rounded-full
        transition-colors duration-150 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background
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
