'use client';

import { IconButtonProps } from '@/types';

const sizeStyles = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const variantStyles = {
  default: 'bg-card/80 hover:bg-card border border-border shadow-sm',
  ghost: 'bg-transparent hover:bg-secondary',
  outline: 'bg-transparent border border-border hover:bg-secondary',
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
        focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background
        text-muted-foreground hover:text-foreground
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
