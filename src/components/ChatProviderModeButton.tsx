'use client';

import { Button } from '@/components/shadcn/button';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

type ChatProviderModeButtonProps = {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

export function ChatProviderModeButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: ChatProviderModeButtonProps) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'ghost'}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className="h-8 rounded-[6px] px-2 text-xs"
    >
      {icon}
      {label}
      {active && <Check className="ml-auto h-3.5 w-3.5" />}
    </Button>
  );
}
