'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from './IconButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  size = 'md',
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  const modalContent = (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-overlay/40 backdrop-blur-sm"
    >
      <div
        className={`
          relative w-full ${sizeClasses[size]}
          bg-[rgba(255,255,255,0.9)] dark:bg-[rgba(10,10,10,0.98)]
          backdrop-blur-xl
          border border-[rgba(255,255,255,0.3)] dark:border-[rgba(38,38,38,0.5)]
          rounded-2xl 
          shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]
          ${className}
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(229,231,235,0.5)] dark:border-[rgba(38,38,38,0.5)]">
            <h2 className="text-lg font-semibold text-theme-foreground">
              {title}
            </h2>
            <IconButton
              icon={<X className="w-4 h-4" />}
              onClick={onClose}
              variant="ghost"
              size="sm"
              ariaLabel="Close modal"
              className="text-theme-muted hover:text-theme-foreground"
            />
          </div>
        )}

        {/* Close button if no title */}
        {!title && (
          <IconButton
            icon={<X className="w-4 h-4" />}
            onClick={onClose}
            variant="ghost"
            size="sm"
            ariaLabel="Close modal"
            className="absolute top-3 right-3 text-theme-muted hover:text-theme-foreground"
          />
        )}

        {/* Content */}
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}

export default Modal;
