'use client';

import {
  ChatView,
  ChatsListView,
  FeatureCards,
  GlassContainer,
  GreetingSection,
  Header,
  MessageInput,
  ShareModal,
} from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface HomePageProps {
  serverGreeting?: string;
  city?: string;
  weather?: { temp: number; emoji: string };
}

export function HomePage({ serverGreeting, city, weather }: HomePageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoadingSharedChat, setIsLoadingSharedChat] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const lastProcessedChatId = useRef<string | null>(null);
  const isUserNavigating = useRef(false);
  
  const {
    user,
    currentView,
    isSearchOpen,
    searchQuery,
    chatSearchQuery,
    chats,
    currentChatId,
    message,
    isLoading,
    isChatLoading,
    featureCards,
    setCurrentView,
    setIsSearchOpen,
    setSearchQuery,
    setChatSearchQuery,
    setMessage,
    setCurrentChatId,
    sendMessage,
    handleCardAction,
    deleteChat,
    loadChatFromApi,
  } = useAppStore();

  // Compute derived state directly from subscribed values (not from getter functions)
  // This ensures proper re-renders when chats or currentChatId change
  const currentChat = chats.find(chat => chat.id === currentChatId);
  const filteredChats = chatSearchQuery.trim() 
    ? chats.filter(chat => 
        chat.title.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
        chat.description?.toLowerCase().includes(chatSearchQuery.toLowerCase())
      )
    : chats;

  // Get hydration state
  const hasHydrated = useAppStore((state) => state._hasHydrated);

  // Load shared chat from API - wrapped in queueMicrotask to avoid React compiler warning
  const loadSharedChat = useCallback((chatId: string) => {
    queueMicrotask(() => {
      setIsLoadingSharedChat(true);
      loadChatFromApi(chatId).then((chat) => {
        setIsLoadingSharedChat(false);
        if (chat) {
          setCurrentChatId(chatId);
          setCurrentView('chat');
        } else {
          router.replace('/', { scroll: false });
          lastProcessedChatId.current = null;
        }
      });
    });
  }, [loadChatFromApi, setCurrentChatId, setCurrentView, router]);

  // Handle URL changes (only for initial load and browser back/forward)
  useEffect(() => {
    if (!hasHydrated) return;
    if (isLoadingSharedChat) return;
    if (isUserNavigating.current) return;
    
    const chatIdFromUrl = searchParams.get('chat');
    
    // Skip if we already processed this URL
    if (chatIdFromUrl === lastProcessedChatId.current) return;
    
    if (chatIdFromUrl) {
      lastProcessedChatId.current = chatIdFromUrl;
      const localChat = chats.find(c => c.id === chatIdFromUrl);
      
      if (localChat) {
        setCurrentChatId(chatIdFromUrl);
        setCurrentView('chat');
      } else {
        // Try to load from API (valid pattern for URL-based data loading)
        loadSharedChat(chatIdFromUrl);
      }
    } else if (lastProcessedChatId.current !== null) {
      // URL changed to no chat - only process if we had a chat before
      lastProcessedChatId.current = null;
      if (currentView === 'chat') {
        setCurrentChatId(null);
        setCurrentView('home');
      }
    }
  }, [searchParams, hasHydrated, chats, setCurrentChatId, setCurrentView, loadSharedChat, currentView, isLoadingSharedChat]);

  // Sync URL when store's currentChatId changes (from internal actions like sendMessage)
  useEffect(() => {
    if (!hasHydrated) return;
    if (isUserNavigating.current) {
      // Reset the flag after a short delay to allow URL to settle
      setTimeout(() => {
        isUserNavigating.current = false;
      }, 100);
      return;
    }
    
    const chatIdFromUrl = searchParams.get('chat');
    
    // If store has a chat but URL doesn't match, update URL
    if (currentChatId && currentChatId !== chatIdFromUrl) {
      lastProcessedChatId.current = currentChatId;
      router.push(`/?chat=${currentChatId}`, { scroll: false });
    }
  }, [currentChatId, hasHydrated, searchParams, router]);


  const handleNewChat = () => {
    isUserNavigating.current = true;
    lastProcessedChatId.current = null;
    setCurrentChatId(null);
    setCurrentView('home');
    router.push('/', { scroll: false });
  };

  const handleSearch = () => {
    setIsSearchOpen(true);
  };

  const handleGrid = () => {
    isUserNavigating.current = true;
    setCurrentView('chats');
  };

  const handleShare = () => {
    if (currentChatId) {
      setIsShareModalOpen(true);
    }
  };

  const shareUrl = currentChatId 
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?chat=${currentChatId}`
    : '';

  const handleBack = () => {
    isUserNavigating.current = true;
    lastProcessedChatId.current = null;
    setCurrentChatId(null);
    setCurrentView('home');
    router.push('/', { scroll: false });
  };

  const handleSelectChat = (chatId: string) => {
    isUserNavigating.current = true;
    lastProcessedChatId.current = chatId;
    setCurrentChatId(chatId);
    setCurrentView('chat');
    router.push(`/?chat=${chatId}`, { scroll: false });
  };

  const handleAddClick = () => {
    console.log('Add attachment clicked');
  };

  const handleHistoryClick = () => {
    isUserNavigating.current = true;
    setCurrentView('chats');
  };

  // State for sharing from chat list
  const [chatListShareUrl, setChatListShareUrl] = useState('');
  const [isChatListShareModalOpen, setIsChatListShareModalOpen] = useState(false);

  const handleShareChatFromList = (chatId: string) => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/?chat=${chatId}`;
    setChatListShareUrl(url);
    setIsChatListShareModalOpen(true);
  };

  // Check if we have a chat ID in URL but store hasn't hydrated yet
  const chatIdFromUrl = searchParams.get('chat');
  const isWaitingForHydration = chatIdFromUrl && !hasHydrated;
  const isLoadingChat = isLoadingSharedChat || isChatLoading || isWaitingForHydration;

  const renderContent = () => {
    // Show loading if:
    // 1. Loading shared chat from API
    // 2. Chat is loading
    // 3. There's a chat ID in URL but store hasn't hydrated yet
    if (isLoadingChat) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900 dark:border-neutral-600 dark:border-t-white"></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading chat...</span>
        </div>
      );
    }

    switch (currentView) {
      case 'chats':
        return (
          <div className="flex-1 overflow-hidden px-3 sm:px-4 lg:px-6 py-2 sm:py-4">
            <ChatsListView
              chats={filteredChats}
              searchQuery={chatSearchQuery}
              onSearchChange={setChatSearchQuery}
              onSelectChat={handleSelectChat}
              onShareChat={handleShareChatFromList}
              onDeleteChat={deleteChat}
            />
          </div>
        );
      
      case 'chat':
        return (
          <ChatView
            chat={currentChat}
            isLoading={isLoading}
            className="flex-1 overflow-hidden"
          />
        );
      
      default:
        // Greeting and feature cards - centered on desktop, compact on mobile
        return (
          <div className="h-full flex flex-col items-center justify-center px-3 sm:px-4 lg:px-6 pb-20 sm:pb-24 lg:pb-28">
            <GreetingSection
              greeting={serverGreeting || user.greeting || 'Hi'}
              city={city}
              weather={weather}
              className="mb-4 sm:mb-6 lg:mb-8"
            />
            <FeatureCards
              cards={featureCards}
              onCardAction={handleCardAction}
              className="mb-2 sm:mb-4"
            />
          </div>
        );
    }
  };

  return (
    <main className="h-[100dvh] w-screen overflow-hidden fixed inset-0">
      <GlassContainer className="h-full w-full flex flex-col rounded-none lg:m-4 lg:h-[calc(100dvh-2rem)] lg:w-[calc(100vw-2rem)] lg:rounded-3xl overflow-hidden">
        {/* Fixed Header - never scrolls */}
        <div className="flex-shrink-0">
          <Header
            onNewChat={handleNewChat}
            onSearch={handleSearch}
            onGrid={handleGrid}
            onShare={handleShare}
            onBack={handleBack}
            showBackButton={currentView !== 'home'}
            showShareButton={!!currentChatId}
            isSearchOpen={isSearchOpen}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchClose={() => {
              setIsSearchOpen(false);
              setSearchQuery('');
            }}
            onSearchOpen={() => setIsSearchOpen(true)}
          />
        </div>
        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {renderContent()}
        </div>
      </GlassContainer>
      
      {/* Hide message input on chats list view */}
      {currentView !== 'chats' && (
        <div className="fixed bottom-0 left-0 right-0 lg:bottom-4 lg:left-4 lg:right-4 px-3 sm:px-4 lg:px-6 pb-safe sm:pb-4 lg:pb-6 pt-2 z-50 safe-area-bottom">
          <MessageInput
            value={message}
            onChange={setMessage}
            onSend={sendMessage}
            onAddClick={handleAddClick}
            onHistoryClick={handleHistoryClick}
            disabled={false}
            isStreaming={isLoading}
            className="max-w-2xl mx-auto"
          />
        </div>
      )}

      {/* Share Modal for current chat */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={shareUrl}
      />

      {/* Share Modal for chat list */}
      <ShareModal
        isOpen={isChatListShareModalOpen}
        onClose={() => setIsChatListShareModalOpen(false)}
        url={chatListShareUrl}
      />
    </main>
  );
}

export default HomePage;
