import { analytics } from '@/lib/analytics';
import { Chat, ChatMessage, ToolCall, User } from '@/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AppState {
  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  
  // User state
  user: User;
  setUser: (user: User) => void;
  
  // View state
  currentView: 'home' | 'chats' | 'chat';
  setCurrentView: (view: 'home' | 'chats' | 'chat') => void;
  
  // Search state
  isSearchOpen: boolean;
  setIsSearchOpen: (isOpen: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Chat search state
  chatSearchQuery: string;
  setChatSearchQuery: (query: string) => void;
  
  // Chat state - full chats stored locally
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  addChat: (chat: Chat) => void;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  deleteChat: (id: string) => void;
  
  // Loading states
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  isChatLoading: boolean;
  setIsChatLoading: (isLoading: boolean) => void;
  activeStreamId: string | null;
  activeStreamController: AbortController | null;
  
  // Message state
  message: string;
  setMessage: (message: string) => void;
  
  // Feature cards
  featureCards: Array<{
    id: string;
    icon: 'projects' | 'skills' | 'resume';
    title: string;
    description: string;
    buttonText: string;
  }>;
  
  // Resume URL
  resumeUrl: string;
  
  // Actions
  createNewChat: (title?: string) => string;
  sendMessage: () => void;
  handleCardAction: (cardId: string) => void;
  loadChatFromApi: (threadId: string) => Promise<Chat | null>;
  
  // Getters
  getCurrentChat: () => Chat | undefined;
  getFilteredChats: () => Chat[];
}

// Helper to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

// Get greeting based on time of day
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// Format date helper
export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

// Format relative time
export const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
};

// Resource ID for memory (using a constant for visitor sessions)
const RESOURCE_ID = 'portfolio-visitor';

type SseBoundary = { index: number; length: number } | null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const findSseBoundary = (buffer: string): SseBoundary => {
  const lfIndex = buffer.indexOf('\n\n');
  const crlfIndex = buffer.indexOf('\r\n\r\n');

  if (lfIndex === -1 && crlfIndex === -1) return null;
  if (lfIndex === -1) return { index: crlfIndex, length: 4 };
  if (crlfIndex === -1) return { index: lfIndex, length: 2 };

  return lfIndex < crlfIndex
    ? { index: lfIndex, length: 2 }
    : { index: crlfIndex, length: 4 };
};

const extractSseData = (event: string) => {
  const dataLines = event
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart());

  return dataLines.length > 0 ? dataLines.join('\n').trim() : '';
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

// Stream response from the Mastra API
const streamResponse = async (
  chatId: string,
  messages: Array<{ role: string; content: string }>,
  updateChat: (id: string, updates: Partial<Chat>) => void,
  getChat: () => Chat | undefined,
  signal: AbortSignal,
  isCurrentStream: () => boolean,
  finishStream: () => void
) => {
  const messageId = generateId();
  let fullContent = '';
  let toolCalls: ToolCall[] = [];
  
  // Create initial assistant message
  const assistantMessage: ChatMessage = {
    id: messageId,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isStreaming: true,
    toolCalls: [],
  };
  
  // Helper to update the message in chat
  const updateMessage = () => {
    if (!isCurrentStream()) return;

    const chat = getChat();
    if (chat && chat.messages) {
      const updatedMessages = chat.messages.filter(m => m.id !== messageId);
      updateChat(chatId, {
        messages: [...updatedMessages, { 
          ...assistantMessage, 
          content: fullContent,
          toolCalls: [...toolCalls],
        }],
        description: fullContent.substring(0, 150) + '...',
      });
    }
  };
  
  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify({ 
        messages,
        threadId: chatId,
        resourceId: RESOURCE_ID,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No reader available');
    }

    const processSseData = (data: string) => {
      if (!data || data === '[DONE]') return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }

      if (!isRecord(parsed)) return;

      if (parsed.type === 'text' && typeof parsed.text === 'string' && parsed.text.length > 0) {
        fullContent += parsed.text;
        updateMessage();
        return;
      }

      if (parsed.type === 'tool-call') {
        const toolCallId = typeof parsed.toolCallId === 'string' ? parsed.toolCallId : generateId();
        const toolName = typeof parsed.toolName === 'string' ? parsed.toolName : 'unknown';

        const newToolCall: ToolCall = {
          id: toolCallId,
          toolName,
          args: parsed.args,
          status: 'running',
        };
        toolCalls = [...toolCalls.filter(t => t.id !== toolCallId), newToolCall];
        updateMessage();
        return;
      }

      if (parsed.type === 'tool-result') {
        const toolCallId = typeof parsed.toolCallId === 'string' ? parsed.toolCallId : '';
        if (!toolCallId) return;

        toolCalls = toolCalls.map(t =>
          t.id === toolCallId
            ? { ...t, status: 'completed' as const, result: parsed.result }
            : t
        );
        updateMessage();
        return;
      }

      if (parsed.type === 'error') {
        const errorMessage = typeof parsed.error === 'string' ? parsed.error : 'Stream error';
        throw new Error(errorMessage);
      }
    };

    const processSseEvent = (event: string) => {
      processSseData(extractSseData(event));
    };

    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });

      let boundary = findSseBoundary(buffer);
      while (boundary) {
        const event = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        processSseEvent(event);
        boundary = findSseBoundary(buffer);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      processSseEvent(buffer);
    }
    
    // Finalize message
    const chat = getChat();
    if (isCurrentStream() && chat && chat.messages) {
      const updatedMessages = chat.messages.filter(m => m.id !== messageId);
      updateChat(chatId, {
        messages: [...updatedMessages, { 
          ...assistantMessage, 
          content: fullContent,
          toolCalls,
          isStreaming: false 
        }],
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Streaming error:', error);
    if (!isCurrentStream() || isAbortError(error)) return;

    if (fullContent) {
      const chat = getChat();
      if (chat && chat.messages) {
        const updatedMessages = chat.messages.filter(m => m.id !== messageId);
        updateChat(chatId, {
          messages: [...updatedMessages, {
            ...assistantMessage,
            content: fullContent,
            toolCalls,
            isStreaming: false,
          }],
          updatedAt: new Date(),
        });
      }

      return;
    }
    
    // Fallback to non-streaming API
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({ 
          messages,
          threadId: chatId,
          resourceId: RESOURCE_ID,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        fullContent = data.text || 'Sorry, I encountered an error.';
      } else {
        fullContent = 'Sorry, I encountered an error processing your request.';
      }
    } catch {
      fullContent = 'Sorry, I encountered an error. Please check if the API is properly configured.';
    }
    
    // Update with fallback content
    const chat = getChat();
    if (isCurrentStream() && chat && chat.messages) {
      const updatedMessages = chat.messages.filter(m => m.id !== messageId);
      updateChat(chatId, {
        messages: [...updatedMessages, { 
          ...assistantMessage, 
          content: fullContent,
          isStreaming: false 
        }],
        updatedAt: new Date(),
      });
    }
  } finally {
    finishStream();
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      
      // Initial user state (visitor)
      user: {
        id: 'visitor',
        name: 'there',
        email: '',
        greeting: getGreeting(),
      },
      setUser: (user) => set({ user }),
      
      // View state
      currentView: 'home',
      setCurrentView: (view) => set({ currentView: view }),
      
      // Search state
      isSearchOpen: false,
      setIsSearchOpen: (isOpen) => set({ isSearchOpen: isOpen }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      // Chat search state
      chatSearchQuery: '',
      setChatSearchQuery: (query) => set({ chatSearchQuery: query }),
      
      // Chat state - full chats stored locally
      chats: [],
      currentChatId: null,
      setCurrentChatId: (id) => {
        set({ currentChatId: id });
        if (id) {
          set({ currentView: 'chat' });
          // Track chat selected
          analytics.chatSelected(id);
        }
      },
      addChat: (chat) => set((state) => ({ 
        chats: [chat, ...state.chats.filter(c => c.id !== chat.id)] 
      })),
      updateChat: (id, updates) => set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === id ? { ...chat, ...updates } : chat
        ),
      })),
      deleteChat: (id) => {
        // Track chat deleted
        analytics.chatDeleted(id);
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== id),
          currentChatId: state.currentChatId === id ? null : state.currentChatId,
        }));
      },
      
      // Loading states
      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),
      isChatLoading: false,
      setIsChatLoading: (isChatLoading) => set({ isChatLoading }),
      activeStreamId: null,
      activeStreamController: null,
      
      // Message state
      message: '',
      setMessage: (message) => set({ message }),
      
      // Feature cards for portfolio
      featureCards: [
        {
          id: 'projects',
          icon: 'projects',
          title: 'View my projects',
          description: "Explore my portfolio of web apps, mobile apps, and open-source contributions.",
          buttonText: 'See Projects',
        },
        {
          id: 'skills',
          icon: 'skills',
          title: 'Technical skills',
          description: 'Discover my tech stack, tools, and areas of expertise.',
          buttonText: 'View Skills',
        },
        {
          id: 'resume',
          icon: 'resume',
          title: 'My resume',
          description: 'Download my resume to learn about my professional journey and achievements.',
          buttonText: 'View Resume',
        },
      ],
      
      // Resume URL
      resumeUrl: 'https://drive.google.com/file/d/1_lHiNuU6GkdKPACsOQLrU-V-KdG-9P0k/view',
      
      // Actions
      createNewChat: (title = 'New Conversation') => {
        const chatId = generateId();
        const now = new Date();
        
        const newChat: Chat = {
          id: chatId,
          title,
          createdAt: now,
          updatedAt: now,
          messages: [],
        };
        
        // Add chat and set current view in a single set call to ensure atomicity
        set((state) => ({
          chats: [newChat, ...state.chats.filter(c => c.id !== chatId)],
          currentChatId: chatId,
          currentView: 'chat' as const,
        }));
        
        // Track new chat creation
        analytics.newChatCreated();
        
        return chatId;
      },
       
      sendMessage: () => {
        const { message, currentChatId, createNewChat, updateChat, isLoading, activeStreamId } = get();
         
        if (!message.trim()) return;
        if (isLoading || activeStreamId) return;
         
        let chatId = currentChatId;
        let existingMessages: Array<{ role: string; content: string }> = [];
        
        // Create new chat if none selected
        if (!chatId) {
          chatId = createNewChat(message.substring(0, 50));
        }
        
        // Get existing messages from current chat - use get() to ensure fresh state
        const chat = get().chats.find(c => c.id === chatId);
        if (chat) {
          existingMessages = chat.messages.map(m => ({ role: m.role, content: m.content }));
        }
        
        // Add user message
        const userMessage: ChatMessage = {
          id: generateId(),
          role: 'user',
          content: message,
          timestamp: new Date(),
        };
        
        // Get current chat again to get latest state
        const currentChat = get().chats.find(c => c.id === chatId);
        if (currentChat) {
          updateChat(chatId!, {
            messages: [...currentChat.messages, userMessage],
            title: currentChat.messages.length === 0 ? message.substring(0, 50) : currentChat.title,
            updatedAt: new Date(),
          });
        } else {
          console.error('Chat not found after creation:', chatId);
        }
        
        // Clear input and set loading
        set({ message: '', isLoading: true });
        
        // Track message sent
        analytics.messageSent(chatId || undefined);
        
        // Build messages array for API - include new user message directly
        const apiMessages = [
          ...existingMessages,
          { role: 'user', content: message }
        ];

        const streamId = generateId();
        const abortController = new AbortController();
        const isCurrentStream = () => get().activeStreamId === streamId;
        const finishStream = () => {
          if (get().activeStreamId === streamId) {
            set({
              isLoading: false,
              activeStreamId: null,
              activeStreamController: null,
            });
          }
        };

        set({ activeStreamId: streamId, activeStreamController: abortController });
         
        // Call the Mastra API
        streamResponse(
          chatId!, 
          apiMessages, 
          updateChat, 
          () => get().chats.find(c => c.id === chatId),
          abortController.signal,
          isCurrentStream,
          finishStream
        );
      },
       
      handleCardAction: (cardId) => {
        const { updateChat, isLoading, activeStreamId } = get();
        if (isLoading || activeStreamId) return;
         
        // Track feature card click
        analytics.featureCardClicked(cardId);
        
        const cardMessages: Record<string, string> = {
          projects: 'Tell me about your projects',
          skills: 'What are your technical skills?',
          screenshots: 'Show me some screenshots of your projects',
          resume: 'Can you share your resume?',
        };
        
        const userQuestion = cardMessages[cardId] || 'Tell me more';
        
        // Create user message
        const userMessage: ChatMessage = {
          id: generateId(),
          role: 'user',
          content: userQuestion,
          timestamp: new Date(),
        };
        
        // Create new chat with the user message already included
        const chatId = generateId();
        const now = new Date();
        const newChat: Chat = {
          id: chatId,
          title: userQuestion,
          createdAt: now,
          updatedAt: now,
          messages: [userMessage],
        };
        
        // Add chat and set state atomically
        set((state) => ({
          chats: [newChat, ...state.chats.filter(c => c.id !== chatId)],
          currentChatId: chatId,
          currentView: 'chat' as const,
          isLoading: true,
        }));
        
        // Build messages array for API
        const apiMessages = [{ role: 'user', content: userQuestion }];

        const streamId = generateId();
        const abortController = new AbortController();
        const isCurrentStream = () => get().activeStreamId === streamId;
        const finishStream = () => {
          if (get().activeStreamId === streamId) {
            set({
              isLoading: false,
              activeStreamId: null,
              activeStreamController: null,
            });
          }
        };

        set({ activeStreamId: streamId, activeStreamController: abortController });
         
        // Call the Mastra API
        streamResponse(
          chatId, 
          apiMessages, 
          updateChat, 
          () => get().chats.find(c => c.id === chatId),
          abortController.signal,
          isCurrentStream,
          finishStream
        );
      },
      
      // Load chat from API (for shared URLs)
      loadChatFromApi: async (threadId: string) => {
        const { setIsChatLoading, addChat } = get();
        
        setIsChatLoading(true);
        
        try {
          const response = await fetch(`/api/chat/${threadId}`);
          
          if (!response.ok) {
            return null;
          }
          
          const data: unknown = await response.json();
          const responseData = isRecord(data) ? data : {};
          const rawMessages = Array.isArray(responseData.messages) ? responseData.messages : [];
          const thread = isRecord(responseData.thread) ? responseData.thread : undefined;
          
          // Convert API messages to our format
          const messages: ChatMessage[] = rawMessages.filter(isRecord).map((msg) => {
            const rawToolInvocations = Array.isArray(msg.toolInvocations) ? msg.toolInvocations : [];

            // Extract tool invocations if present
            const toolCalls: ToolCall[] | undefined = rawToolInvocations.filter(isRecord).map((inv) => {
              const state = typeof inv.state === 'string' ? inv.state : '';

              return {
                id: typeof inv.toolCallId === 'string' ? inv.toolCallId : generateId(),
                toolName: typeof inv.toolName === 'string' ? inv.toolName : 'unknown',
                args: inv.args,
                status: state === 'result' ? 'completed' :
                        state === 'partial-call' ? 'running' :
                        'pending',
                result: inv.result,
              };
            });

            const role = msg.role === 'assistant' ? 'assistant' : 'user';
            const createdAt = typeof msg.createdAt === 'string' || typeof msg.createdAt === 'number'
              ? new Date(msg.createdAt)
              : new Date();

            return {
              id: typeof msg.id === 'string' ? msg.id : generateId(),
              role,
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? ''),
              timestamp: createdAt,
              toolCalls,
            };
          });
          
          const chat: Chat = {
            id: threadId,
            title: typeof thread?.title === 'string' ? thread.title : 'Conversation',
            createdAt: typeof thread?.createdAt === 'string' || typeof thread?.createdAt === 'number'
              ? new Date(thread.createdAt)
              : new Date(),
            updatedAt: typeof thread?.updatedAt === 'string' || typeof thread?.updatedAt === 'number'
              ? new Date(thread.updatedAt)
              : new Date(),
            messages,
          };
          
          // Add to local chats
          addChat(chat);
          
          // Track shared chat opened
          analytics.sharedChatOpened(threadId);
          
          return chat;
        } catch (error) {
          console.error('Error loading chat:', error);
          return null;
        } finally {
          setIsChatLoading(false);
        }
      },
      
      // Getters
      getCurrentChat: () => {
        const { chats, currentChatId } = get();
        return chats.find((chat) => chat.id === currentChatId);
      },
      
      getFilteredChats: () => {
        const { chats, chatSearchQuery } = get();
        if (!chatSearchQuery.trim()) return chats;
        
        const query = chatSearchQuery.toLowerCase();
        return chats.filter(
          (chat) =>
            chat.title.toLowerCase().includes(query) ||
            chat.description?.toLowerCase().includes(query)
        );
      },
    }),
    {
      name: 'portfolio-chat-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        chats: state.chats,
        user: state.user,
      }),
      // Rehydrate dates after loading from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.chats = state.chats.map(chat => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: chat.messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }));
          // Always update greeting to current time on rehydration
          state.user = {
            ...state.user,
            greeting: getGreeting(),
          };
          state._hasHydrated = true;
        }
      },
    }
  )
);

export default useAppStore;
