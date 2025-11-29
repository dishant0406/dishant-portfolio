import { ReactNode } from 'react';

// Button Types
export interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'outline' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

// IconButton Types
export interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
  ariaLabel?: string;
}

// Card Types
export interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

// GlassContainer Types
export interface GlassContainerProps {
  children: ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg';
}

// Input Types
export interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

// Feature Card Types
export interface FeatureCardData {
  id: string;
  icon: 'campaign' | 'spend' | 'ads';
  title: string;
  description: string;
  buttonText: string;
}

export interface FeatureCardProps {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onAction?: (id: string) => void;
  className?: string;
}

// User Types
export interface User {
  name: string;
  greeting?: string;
}

// Chat Message Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// Chat Types
export interface Chat {
  id: string;
  title: string;
  description?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// View Types
export type ViewType = 'home' | 'chats' | 'chat';

// App State Types
export interface AppState {
  // User
  user: User;
  
  // View state
  currentView: ViewType;
  
  // Search state
  isSearchOpen: boolean;
  searchQuery: string;
  chatSearchQuery: string;
  
  // Chat state
  chats: Chat[];
  currentChatId: string | null;
  message: string;
  isLoading: boolean;
  isStreaming: boolean;
  
  // Feature cards
  featureCards: FeatureCardData[];
  
  // Actions
  setUser: (user: User) => void;
  setCurrentView: (view: ViewType) => void;
  setIsSearchOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  setChatSearchQuery: (query: string) => void;
  setMessage: (message: string) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentChatId: (id: string | null) => void;
  
  // Chat actions
  createNewChat: () => string;
  sendMessage: () => void;
  handleCardAction: (cardId: string) => void;
  deleteChat: (chatId: string) => void;
  clearMessage: () => void;
  
  // Computed
  getCurrentChat: () => Chat | undefined;
  getFilteredChats: () => Chat[];
}
