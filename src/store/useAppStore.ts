import { analytics } from '@/lib/analytics';
import { Chat, ChatMessage, ToolCall, User } from '@/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateId } from './chatIds';
import { stopStreamingMessages, streamResponse } from './chatStream';

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
  startChatWithMessage: (content: string, options?: { forceNew?: boolean; title?: string }) => string | null;
  sendMessage: () => string | null;
  handleCardAction: (cardId: string) => string | null;
  cancelActiveStream: () => void;
  resetToNewChat: () => void;
  loadChatFromApi: (threadId: string) => Promise<Chat | null>;
  
  // Getters
  getCurrentChat: () => Chat | undefined;
  getFilteredChats: () => Chat[];
}

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const cardMessages: Record<string, string> = {
  projects: 'Tell me about your projects',
  skills: 'What are your technical skills?',
  screenshots: 'Show me some screenshots of your projects',
  resume: 'Can you share your resume?',
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
       
      cancelActiveStream: () => {
        const { activeStreamController } = get();
        activeStreamController?.abort();

        set((state) => ({
          isLoading: false,
          activeStreamId: null,
          activeStreamController: null,
          chats: state.chats.map((chat) => {
            const hasStreamingMessage = chat.messages.some((message) => message.isStreaming);
            if (!hasStreamingMessage) return chat;

            return {
              ...chat,
              messages: stopStreamingMessages(chat.messages),
              updatedAt: new Date(),
            };
          }),
        }));
      },

      resetToNewChat: () => {
        get().cancelActiveStream();
        set({
          currentChatId: null,
          currentView: 'home',
          message: '',
        });
      },

      startChatWithMessage: (content, options = {}) => {
        const userQuestion = content.trim();
        if (!userQuestion) return null;

        const state = get();
        if (state.activeStreamId) {
          if (!options.forceNew) return null;
          state.cancelActiveStream();
        }

        let chatId = options.forceNew ? null : get().currentChatId;
        let currentChat = chatId ? get().chats.find(c => c.id === chatId) : undefined;

        if (!chatId || !currentChat) {
          chatId = get().createNewChat(options.title || userQuestion.substring(0, 50));
          currentChat = get().chats.find(c => c.id === chatId);
        }

        if (!currentChat) {
          console.error('Chat not found after creation:', chatId);
          return null;
        }

        const existingMessages = currentChat.messages.map(m => ({ role: m.role, content: m.content }));
        const userMessage: ChatMessage = {
          id: generateId(),
          role: 'user',
          content: userQuestion,
          timestamp: new Date(),
        };

        get().updateChat(chatId, {
          messages: [...currentChat.messages, userMessage],
          title: currentChat.messages.length === 0 ? userQuestion.substring(0, 50) : currentChat.title,
          updatedAt: new Date(),
        });

        set({
          message: '',
          isLoading: true,
          currentChatId: chatId,
          currentView: 'chat',
        });

        analytics.messageSent(chatId);

        const apiMessages = [
          ...existingMessages,
          { role: 'user', content: userQuestion },
        ];
        const streamId = generateId();
        const abortController = new AbortController();
        const isCurrentStream = () => (
          get().activeStreamId === streamId && get().chats.some(c => c.id === chatId)
        );
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

        streamResponse({
          chatId,
          messages: apiMessages,
          updateChat: get().updateChat,
          getChat: () => get().chats.find(c => c.id === chatId),
          signal: abortController.signal,
          isCurrentStream,
          finishStream,
        });

        return chatId;
      },

      sendMessage: () => {
        return get().startChatWithMessage(get().message);
      },

      handleCardAction: (cardId) => {
        analytics.featureCardClicked(cardId);

        return get().startChatWithMessage(
          cardMessages[cardId] || 'Tell me more',
          { forceNew: true }
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
