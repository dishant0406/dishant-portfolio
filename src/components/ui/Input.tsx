'use client';

import { useEffect, useRef } from 'react';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  maxRows?: number;
  autoFocus?: boolean;
}

export function Input({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  className = '',
  onKeyDown,
  maxRows = 4,
  autoFocus = false,
}: TextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate proper scrollHeight
    textarea.style.height = 'auto';
    
    // Get computed styles for accurate line height
    const computedStyle = getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    
    // Calculate max height based on maxRows
    const maxHeight = (lineHeight * maxRows) + paddingTop + paddingBottom;
    
    // Set height based on content, capped at maxHeight
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
    
    // Enable scrolling if content exceeds max height
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value, maxRows]);

  // Auto-focus on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [autoFocus, disabled]);

  // Focus when disabled changes from true to false (streaming ends)
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Enter key (submit) vs Shift+Enter (new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onKeyDown?.(e);
    } else if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      onKeyDown={handleKeyDown}
      rows={1}
      className={`
        w-full
        bg-transparent
        outline-none
        text-gray-900 dark:text-white
        placeholder-gray-400 dark:placeholder-gray-500
        disabled:opacity-50
        disabled:cursor-not-allowed
        resize-none
        text-sm
        leading-[1.5]
        py-0
        m-0
        ${className}
      `}
    />
  );
}

export default Input;
