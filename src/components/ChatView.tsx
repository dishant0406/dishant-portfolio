'use client';

import { useUIStream } from '@/hooks';
import type { JsonRendererResult } from '@/json-render/types';
import { Chat, ChatMessage, ToolCall } from '@/types';
import { Check, ChevronDown, Loader2, Sparkles, User, Wrench } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import JsonRendererEmbed from './ui/JsonRendererEmbed';

// Tool name to human-readable display name
const toolDisplayNames: Record<string, string> = {
  'getGitHubProfile': 'Fetching GitHub profile',
  'getGitHubRepos': 'Loading repositories',
  'getRepoReadme': 'Reading project README',
  'getGitHubActivity': 'Getting recent activity',
  'getGitHubStats': 'Analyzing GitHub stats',
  'searchRepos': 'Searching repositories',
  'getPersonalInfo': 'Loading personal info',
  'generateJsonRenderer': 'Building UI layout',
};

function buildJsonRendererLookup(toolCalls?: ToolCall[]): Record<string, JsonRendererResult> {
  if (!toolCalls) return {};

  return toolCalls.reduce((acc, toolCall) => {
    if (toolCall.toolName !== 'generateJsonRenderer') return acc;
    const result = toolCall.result as JsonRendererResult | undefined;
    if (result?.id && result.tree) {
      acc[result.id] = result;
    }
    return acc;
  }, {} as Record<string, JsonRendererResult>);
}

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
    return resultStr
  };
  
  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          flex items-center gap-2 px-3 w-full py-3 text-xs
          transition-all duration-200
          ${isRunning 
            ? 'bg-warning/10 text-warning' 
            : 'bg-secondary/60 text-muted-foreground '
          }
        `}
      >
        {isRunning ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isCompleted ? (
          <Check className="w-3 h-3 text-success" />
        ) : (
          <Wrench className="w-3 h-3" />
        )}
        <span className="font-medium">{displayName}</span>
        {isCompleted && (
          <div className={`ml-auto transition-transform duration-500 ease-in-out ${isExpanded ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown className="w-3 h-3" />
          </div>
        )}
      </button>
      
      {/* Expanded view showing result preview */}
      {isCompleted && toolCall.result !== undefined && (
        <div
          className={`
            overflow-hidden transition-all duration-500 ease-in-out
            ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <pre className="text-[10px] text-muted-foreground overflow-x-auto max-h-32 overflow-y-auto p-2">
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
    <div className='mb-1 rounded-lg border border-border overflow-hidden'>
      {toolCalls.map((toolCall) => (
        <ToolCallDisplay key={toolCall.id} toolCall={toolCall} />
      ))}
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isLastInGroup?: boolean;
  isLatestAssistant?: boolean;
}


function MessageBubble({ message, isLastInGroup = true, isLatestAssistant = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const hasActiveToolCalls = message.toolCalls?.some(t => t.status === 'running');
  const { tree, data, setTreeString } = useUIStream();

  useEffect(() => {
    if(message.content?.trim()){
      setTreeString(message.content?.trim());
    }
  }, [message.content]);

  return (
    <div 
      className={`
        flex items-start justify-center gap-3 sm:gap-4
        ${isUser ? 'flex-row-reverse' : 'flex-row'}
        ${isLastInGroup ? '' : 'mb-1'}
      `}
    >
      {/* Avatar - only show for first message in group or all messages */}
      <div className={`shrink-0 md:block hidden ${isLastInGroup ? 'visible' : 'invisible'}`}>
        <div
          className={`
            w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
            transition-all duration-200
            ${isUser 
              ? 'bg-secondary mt-2' 
              : 'bg-primary'
            }
          `}
        >
          {isUser ? (
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary-foreground" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex-1 min-w-0 max-w-[90%] md:max-w-[85%] sm:max-w-[80%] ${isUser ? 'flex justify-end' : ''}`}>
        {isUser ? (
          <div 
            className={`
              inline-block px-3 sm:px-4 py-2 sm:py-2.5 
              rounded-2xl rounded-tr-md
              bg-primary 
              mt-2
              text-primary-foreground 
              text-[14px] sm:text-[15px] leading-relaxed
              shadow-sm
              wrap-break-word
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
                 rounded-tl-md
                  overflow-hidden
                `}
              >
                {message.isStreaming && !message.content && !hasActiveToolCalls ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : message.content ? (
                  <div>
                    <div className="text-[14px] sm:text-[15px] leading-relaxed text-foreground overflow-hidden wrap-break-word" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                      {/* <Markdown jsonRendererLookup={jsonRendererLookup}>{message.content}</Markdown> */}
                      <JsonRendererEmbed
                        isLatestMessage={isLatestAssistant}
                        result={{
                          id: 'key',
                          tree: tree,
                          data: data
                        }}
                      />
                      
                    </div>
                  </div>
                ) : null}
              </div>
            )}

              {message.isStreaming && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Generating response...</span>
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
        <div className="md:max-w-[60vw] max-w-full mx-auto px-1 sm:px-4 lg:px-6 space-y-3 sm:space-y-6">
          {(() => {
            let lastAssistantIndex = -1;
            for (let i = chat.messages.length - 1; i >= 0; i -= 1) {
              if (chat.messages[i].role === 'assistant') {
                lastAssistantIndex = i;
                break;
              }
            }

            return chat.messages.map((message, index) => {
              const nextMessage = chat.messages[index + 1];
              const isLastInGroup = !nextMessage || nextMessage.role !== message.role;
              const isLatestAssistant = message.role === 'assistant' && index === lastAssistantIndex;
              
              return (
                <MessageBubble 
                  key={message.id} 
                  message={message} 
                  isLastInGroup={isLastInGroup}
                  isLatestAssistant={isLatestAssistant}
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
  );
}

export default ChatView;
