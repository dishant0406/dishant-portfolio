'use client';

import { portfolioLibrary } from '@/openui/library';
import { ChatMessage } from '@/types';
import { Renderer } from '@openuidev/react-lang';
import { Loader2, Sparkles, User } from 'lucide-react';
import { Markdown } from './ui/Markdown';
import { ThinkingTrace } from './ThinkingTrace';

interface MessageBubbleProps {
  message: ChatMessage;
  isLastInGroup?: boolean;
  onContinueConversation?: (message: string) => void;
}

const isOpenUIResponse = (content: string) =>
  /(^|\n)\s*root\s*=/.test(content);

export function MessageBubble({
  message,
  isLastInGroup = true,
  onContinueConversation,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasActiveToolCalls = message.toolCalls?.some((tool) => tool.status === 'running');
  const hasWorkTrace = Boolean(message.thinking?.content || message.statusEvents?.length);

  return (
    <div
      className={`
        flex items-start justify-center gap-3 sm:gap-4
        ${isUser ? 'flex-row-reverse' : 'flex-row'}
        ${isLastInGroup ? '' : 'mb-1'}
      `}
    >
      <div className={`shrink-0 md:block hidden ${isLastInGroup ? 'visible' : 'invisible'}`}>
        <div
          className={`
            w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
            transition-all duration-200 ${isUser ? 'bg-secondary mt-2' : 'bg-primary'}
          `}
        >
          {isUser ? (
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary-foreground" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
          )}
        </div>
      </div>

      <div className={`flex-1 min-w-0 max-w-[90%] md:max-w-[85%] sm:max-w-[80%] ${isUser ? 'flex justify-end' : ''}`}>
        {isUser ? (
          <div
            className="
              inline-block px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl rounded-tr-md
              bg-primary mt-2 text-primary-foreground text-[14px] sm:text-[15px]
              leading-relaxed shadow-sm wrap-break-word
            "
          >
            {message.content}
          </div>
        ) : (
          <div className="space-y-0 min-w-0 w-full">
            <ThinkingTrace
              thinking={message.thinking}
              statusEvents={message.statusEvents}
              isStreaming={message.isStreaming}
              hasResponse={Boolean(message.content)}
            />

            {(message.content || (!hasActiveToolCalls && !message.isStreaming)) && (
              <div className="rounded-tl-md overflow-hidden">
                {message.isStreaming && !message.content && !hasActiveToolCalls ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : message.content ? (
                  <div className="text-[14px] sm:text-[15px] leading-relaxed text-foreground overflow-hidden wrap-break-word" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {isOpenUIResponse(message.content) ? (
                      <Renderer
                        library={portfolioLibrary}
                        response={message.content}
                        isStreaming={!!message.isStreaming}
                        onAction={(event) => {
                          if (event.type === 'continue_conversation') {
                            onContinueConversation?.(event.humanFriendlyMessage);
                          } else if (event.type === 'open_url' && event.params?.url) {
                            window.open(event.params.url as string, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      />
                    ) : (
                      <Markdown className="text-muted-foreground">
                        {message.content}
                      </Markdown>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {message.isStreaming && !hasWorkTrace && (
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
