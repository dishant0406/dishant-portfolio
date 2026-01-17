'use client';

import { ArrowUp, Clock } from 'lucide-react';
import { IconButton, Input } from './ui';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend?: () => void;
  onAddClick?: () => void;
  onHistoryClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isStreaming?: boolean;
  className?: string;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onHistoryClick,
  placeholder = 'Ask me anything about Dishant...',
  disabled = false,
  isStreaming = false,
  className = '',
}: MessageInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && value.trim() && !isStreaming) {
      e.preventDefault();
      onSend?.();
    }
  };

  const hasText = value.trim().length > 0;
  const canSend = hasText && !isStreaming && !disabled;

  return (
    <div
      className={`
        flex items-end gap-1.5 sm:gap-2 lg:gap-3
        px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3
        bg-card/90
        backdrop-blur-md
        border border-border
        rounded-2xl
        shadow-sm
        ${className}
      `}
    >
      {/* Left icons - align to top when textarea expands */}
      <div className="flex items-center gap-1 self-end ">
        {/* Plus button */}
        {/* <IconButton
          icon={<Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
          onClick={onAddClick}
          variant="ghost"
          size="sm"
          ariaLabel="Add attachment"
          className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0 text-muted-foreground hover:text-foreground/80"
        /> */}

        {/* History/Clock button */}
        <IconButton
          icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
          onClick={onHistoryClick}
          variant="ghost"
          size="sm"
          ariaLabel="View history"
          className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-muted-foreground hover:text-foreground/80"
        />
      </div>

      {/* Input field - auto-expanding textarea */}
      <Input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled || isStreaming}
        onKeyDown={handleKeyDown}
        autoFocus={true}
        maxRows={4}
        className="flex-1 min-w-0 self-center"
      />

      {/* Send button - always aligned to bottom right */}
      <div className="self-end ">
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className={`
            w-7 h-7 sm:w-8 sm:h-8 shrink-0
            inline-flex items-center justify-center
            rounded-full
            transition-colors duration-150 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background
            ${canSend 
              ? 'bg-primary text-primary-foreground border border-primary hover:bg-primary/90 cursor-pointer' 
              : 'bg-transparent text-muted-foreground border border-border cursor-not-allowed opacity-50'
            }
          `}
        >
          <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
}

export default MessageInput;
