'use client';

import { Chat } from '@/types';
import { Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { OpenUIThemeScope } from './OpenUIThemeScope';

interface ChatViewProps {
  chat?: Chat;
  isLoading?: boolean;
  onContinueConversation?: (message: string) => void;
  className?: string;
}

export function ChatView({ chat, isLoading, onContinueConversation, className = '' }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!chat) {
    return (
      <div className={`flex items-center justify-center text-theme-muted ${className}`}>
        No chat selected
      </div>
    );
  }

  return (
    <OpenUIThemeScope>
      <div className={`flex flex-col h-full ${className}`}>
      {/* Messages container - full width for scroll, content centered and constrained */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-4 sm:py-6 pb-24 sm:pb-28"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Centered content wrapper - matches input width, minimal padding on mobile */}
        <div className="md:max-w-[60vw] max-w-full mx-auto px-1 sm:px-4 lg:px-6 space-y-3 sm:space-y-6">
          {(() => {
            return chat.messages.map((message, index) => {
              const nextMessage = chat.messages[index + 1];
              const isLastInGroup = !nextMessage || nextMessage.role !== message.role;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLastInGroup={isLastInGroup}
                  onContinueConversation={onContinueConversation}
                />
              );
            });
          })()}

          {/* Loading indicator */}
          {isLoading && chat.messages.length > 0 && !chat.messages[chat.messages.length - 1]?.isStreaming && (
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="shrink-0 md:block hidden">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
                </div>
              </div>
              <div
                className="px-4 py-3 rounded-2xl md:rounded-tl-md bg-card/90 border border-border/60 shadow-sm "
              >
                <div className="flex items-center gap-1.5 py-1">
                  <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      </div>
    </OpenUIThemeScope>
  );
}

export default ChatView;
