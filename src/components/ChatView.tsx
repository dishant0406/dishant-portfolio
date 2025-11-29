'use client';

import { Chat, ChatMessage } from '@/types';
import { Sparkles, User } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Card, Markdown } from './ui';

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center
            ${isUser 
              ? 'bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700' 
              : 'bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800'
            }
          `}
        >
          {isUser ? (
            <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <Sparkles className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex justify-end' : ''}`}>
        {isUser ? (
          <div className="inline-block px-4 py-2 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-black text-sm">
            {message.content}
          </div>
        ) : (
          <Card padding="sm" hover={false} className="bg-white/80 dark:bg-neutral-900/80 border-gray-100 dark:border-neutral-800">
            {message.isStreaming && !message.content ? (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <div className="text-sm text-gray-900 dark:text-gray-100">
                <Markdown>{message.content}</Markdown>
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-gray-400 dark:bg-gray-500 animate-blink ml-0.5" />
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

interface ChatViewProps {
  chat?: Chat;
  isLoading?: boolean;
  className?: string;
}

export function ChatView({ chat, isLoading, className = '' }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    scrollToBottom();
  }, [chat?.messages, isLoading]);

  // Also scroll when content changes (for streaming)
  useEffect(() => {
    const lastMessage = chat?.messages[chat?.messages.length - 1];
    if (lastMessage?.isStreaming) {
      const scrollToBottom = () => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      };
      scrollToBottom();
    }
  }, [chat?.messages]);

  if (!chat) {
    return (
      <div className={`flex items-center justify-center text-gray-500 dark:text-gray-400 ${className}`}>
        No chat selected
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Messages - added pb-24 for fixed input at bottom */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto px-3 sm:px-4 lg:px-6 py-4 pb-24 space-y-4"
      >
        {chat.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Loading indicator */}
        {isLoading && chat.messages.length > 0 && !chat.messages[chat.messages.length - 1]?.isStreaming && (
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
            </div>
            <Card padding="sm" hover={false} className="bg-white/80 dark:bg-neutral-900/80 border-gray-100 dark:border-neutral-800">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </Card>
          </div>
        )}
        
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default ChatView;
