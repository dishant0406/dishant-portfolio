'use client';

import { Chat, ChatMessage, ToolCall } from '@/types';
import { Check, ChevronDown, ChevronRight, Loader2, Sparkles, User, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Markdown } from './ui';

// Tool name to human-readable display name
const toolDisplayNames: Record<string, string> = {
  'getGitHubProfile': 'Fetching GitHub profile',
  'getGitHubRepos': 'Loading repositories',
  'getRepoReadme': 'Reading project README',
  'getGitHubActivity': 'Getting recent activity',
  'getGitHubStats': 'Analyzing GitHub stats',
  'searchRepos': 'Searching repositories',
  'getPersonalInfo': 'Loading personal info',
};

interface ToolCallDisplayProps {
  toolCall: ToolCall;
}

function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = toolCall.status === 'running';
  const isCompleted = toolCall.status === 'completed';
  
  const displayName = toolDisplayNames[toolCall.toolName] || toolCall.toolName;
  
  // Compute result preview string
  const getResultPreview = (): string => {
    if (!toolCall.result) return '';
    const resultStr = typeof toolCall.result === 'string' 
      ? toolCall.result 
      : JSON.stringify(toolCall.result, null, 2);
    return resultStr.length > 500 ? resultStr.substring(0, 500) + '...' : resultStr;
  };
  
  return (
    <div className="my-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
          transition-all duration-200
          ${isRunning 
            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/30' 
            : 'bg-gray-50 dark:bg-neutral-800/50 text-gray-600 dark:text-gray-400 border border-gray-200/50 dark:border-neutral-700/30'
          }
        `}
      >
        {isRunning ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isCompleted ? (
          <Check className="w-3 h-3 text-green-500 dark:text-green-400" />
        ) : (
          <Wrench className="w-3 h-3" />
        )}
        <span className="font-medium">{displayName}</span>
        {isCompleted && (
          isExpanded ? (
            <ChevronDown className="w-3 h-3 ml-auto" />
          ) : (
            <ChevronRight className="w-3 h-3 ml-auto" />
          )
        )}
      </button>
      
      {/* Expanded view showing result preview */}
      {isExpanded && isCompleted && toolCall.result !== undefined && (
        <div className="mt-1 ml-3 pl-3 border-l-2 border-gray-200 dark:border-neutral-700">
          <pre className="text-[10px] text-gray-500 dark:text-gray-500 overflow-x-auto max-h-32 overflow-y-auto bg-gray-50 dark:bg-neutral-800/30 p-2 rounded">
            {String(getResultPreview())}
          </pre>
        </div>
      )}
    </div>
  );
}

interface ToolCallsListProps {
  toolCalls: ToolCall[];
}

function ToolCallsList({ toolCalls }: ToolCallsListProps) {
  if (!toolCalls || toolCalls.length === 0) return null;
  
  return (
    <div className="mb-2">
      {toolCalls.map((toolCall) => (
        <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
      ))}
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isLastInGroup?: boolean;
}

function MessageBubble({ message, isLastInGroup = true }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasActiveToolCalls = message.toolCalls?.some(t => t.status === 'running');

  return (
    <div 
      className={`
        flex items-start gap-3 sm:gap-4
        ${isUser ? 'flex-row-reverse' : 'flex-row'}
        ${isLastInGroup ? '' : 'mb-1'}
      `}
    >
      {/* Avatar - only show for first message in group or all messages */}
      <div className={`flex-shrink-0 ${isLastInGroup ? 'visible' : 'invisible'}`}>
        <div
          className={`
            w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
            transition-all duration-200
            ${isUser 
              ? 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-neutral-700 dark:to-neutral-800' 
              : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-neutral-800 dark:to-neutral-900'
            }
          `}
        >
          {isUser ? (
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 max-w-[85%] sm:max-w-[80%] ${isUser ? 'flex justify-end' : ''}`}>
        {isUser ? (
          <div 
            className={`
              inline-block px-3 sm:px-4 py-2 sm:py-2.5 
              rounded-2xl rounded-tr-md
              bg-gray-900 dark:bg-white 
              text-white dark:text-gray-900 
              text-[14px] sm:text-[15px] leading-relaxed
              shadow-sm
              break-words
            `}
          >
            {message.content}
          </div>
        ) : (
          <div className="space-y-0 min-w-0 w-full">
            {/* Tool calls display */}
            {hasToolCalls && (
              <ToolCallsList toolCalls={message.toolCalls!} />
            )}
            
            {/* Message content */}
            {(message.content || (!hasActiveToolCalls && !message.isStreaming)) && (
              <div 
                className={`
                  px-3 sm:px-4 py-2.5 sm:py-3
                  rounded-2xl rounded-tl-md
                  bg-white/90 dark:bg-neutral-900/95
                  border border-gray-200/60 dark:border-neutral-700/50
                  shadow-sm dark:shadow-neutral-900/20
                  overflow-hidden
                `}
              >
                {message.isStreaming && !message.content && !hasActiveToolCalls ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : message.content ? (
                  <div className="text-[14px] sm:text-[15px] leading-relaxed text-gray-800 dark:text-gray-100 overflow-hidden break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    <Markdown>{message.content}</Markdown>
                    {message.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-gray-400 dark:bg-gray-500 animate-blink ml-0.5 rounded-sm" />
                    )}
                  </div>
                ) : null}
              </div>
            )}
            
            {/* Show loading dots only when there are active tool calls and no content yet */}
            {hasActiveToolCalls && !message.content && (
              <div 
                className={`
                  px-4 py-3 mt-2
                  rounded-2xl rounded-tl-md
                  bg-white/90 dark:bg-neutral-900/95
                  border border-gray-200/60 dark:border-neutral-700/50
                  shadow-sm dark:shadow-neutral-900/20
                `}
              >
                <div className="flex items-center gap-1.5 py-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
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
      <div className={`flex items-center justify-center text-theme-muted ${className}`}>
        No chat selected
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages container - full width for scroll, content centered and constrained */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-4 sm:py-6 pb-24 sm:pb-28"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Centered content wrapper - matches input width, minimal padding on mobile */}
        <div className="max-w-2xl mx-auto px-1 sm:px-4 lg:px-6 space-y-3 sm:space-y-6">
          {chat.messages.map((message, index) => {
            // Check if this is the last message from the same role
            const nextMessage = chat.messages[index + 1];
            const isLastInGroup = !nextMessage || nextMessage.role !== message.role;
            
            return (
              <MessageBubble 
                key={message.id} 
                message={message} 
                isLastInGroup={isLastInGroup}
              />
            );
          })}
          
          {/* Loading indicator */}
          {isLoading && chat.messages.length > 0 && !chat.messages[chat.messages.length - 1]?.isStreaming && (
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
                </div>
              </div>
              <div 
                className="px-4 py-3 rounded-2xl rounded-tl-md bg-white/90 dark:bg-neutral-900/95 border border-gray-200/60 dark:border-neutral-700/50 shadow-sm dark:shadow-neutral-900/20"
              >
                <div className="flex items-center gap-1.5 py-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export default ChatView;
