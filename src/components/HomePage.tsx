'use client';

import {
  ChatView,
  ChatsListView,
  ChatProviderSelector,
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

interface Holiday {
  name: string;
  date: string;
  emoji: string;
}

interface HomePageProps {
  serverGreeting?: string;
  city?: string;
  weather?: { temp: number; emoji: string; description: string };
  holiday?: Holiday;
}

export function HomePage({ serverGreeting, city, weather, holiday }: HomePageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoadingSharedChat, setIsLoadingSharedChat] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const lastProcessedChatId = useRef<string | null>(null);
  const isUserNavigating = useRef(false);
  const expectedChatIdInUrl = useRef<string | null>(null);
  const pendingLocalChatIds = useRef(new Set<string>());
  
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
    chatProvider,
    localModelId,
    featureCards,
    setCurrentView,
    setIsSearchOpen,
    setSearchQuery,
    setChatSearchQuery,
    setMessage,
    setCurrentChatId,
    setChatProvider,
    setLocalModelId,
    startChatWithMessage,
    sendMessage,
    handleCardAction: runCardAction,
    resetToNewChat,
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

  const navigateToChat = useCallback((chatId: string) => {
    pendingLocalChatIds.current.add(chatId);
    isUserNavigating.current = true;
    expectedChatIdInUrl.current = chatId;
    lastProcessedChatId.current = chatId;
    setCurrentChatId(chatId);
    setCurrentView('chat');
    router.push(`/?chat=${encodeURIComponent(chatId)}`, { scroll: false });
  }, [router, setCurrentChatId, setCurrentView]);

  const navigateHome = useCallback(() => {
    pendingLocalChatIds.current.clear();
    isUserNavigating.current = true;
    expectedChatIdInUrl.current = null;
    lastProcessedChatId.current = null;
    resetToNewChat();
    router.push('/', { scroll: false });
  }, [resetToNewChat, router]);

  // Load shared chat from API - wrapped in queueMicrotask to avoid React compiler warning
  const loadSharedChat = useCallback((chatId: string) => {
    queueMicrotask(() => {
      setIsLoadingSharedChat(true);
      loadChatFromApi(chatId).then((chat) => {
        setIsLoadingSharedChat(false);
        const urlChatId = new URLSearchParams(window.location.search).get('chat');
        if (urlChatId !== chatId) return;

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
    
    const chatIdFromUrl = searchParams.get('chat');

    if (isUserNavigating.current && chatIdFromUrl !== expectedChatIdInUrl.current) {
      return;
    }

    if (isUserNavigating.current) {
      isUserNavigating.current = false;
    }
    
    if (chatIdFromUrl) {
      const localChat = chats.find(c => c.id === chatIdFromUrl);

      if (localChat) {
        pendingLocalChatIds.current.delete(chatIdFromUrl);
        lastProcessedChatId.current = chatIdFromUrl;
        if (currentChatId !== chatIdFromUrl) {
          setCurrentChatId(chatIdFromUrl);
        }
        if (currentView === 'home' || currentChatId !== chatIdFromUrl) {
          setCurrentView('chat');
        }
        return;
      }

      if (pendingLocalChatIds.current.has(chatIdFromUrl)) return;
      if (chatIdFromUrl === lastProcessedChatId.current) return;

      lastProcessedChatId.current = chatIdFromUrl;
      loadSharedChat(chatIdFromUrl);
      return;
    }

    if (lastProcessedChatId.current !== null || currentChatId || currentView === 'chat') {
      lastProcessedChatId.current = null;
      pendingLocalChatIds.current.clear();
      resetToNewChat();
    }
  }, [searchParams, hasHydrated, chats, currentChatId, currentView, setCurrentChatId, setCurrentView, loadSharedChat, isLoadingSharedChat, resetToNewChat]);


  const handleNewChat = () => {
    navigateHome();
  };

  const handleSearch = () => {
    setIsSearchOpen(true);
  };

  const handleGrid = () => {
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
    navigateHome();
  };

  const handleSelectChat = (chatId: string) => {
    navigateToChat(chatId);
  };

  const handleAddClick = () => {
    console.log('Add attachment clicked');
  };

  const handleHistoryClick = () => {
    setCurrentView('chats');
  };

  const handleSendMessage = () => {
    const chatId = sendMessage();
    if (chatId) {
      navigateToChat(chatId);
    }
  };

  const handleCardAction = (cardId: string) => {
    const chatId = runCardAction(cardId);
    if (chatId) {
      navigateToChat(chatId);
    }
  };

  const handleContinueConversation = (content: string) => {
    const chatId = startChatWithMessage(content);
    if (chatId) {
      navigateToChat(chatId);
    }
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
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-border border-t-primary"></div>
          <span className="text-sm text-muted-foreground">Loading chat...</span>
        </div>
      );
    }

    switch (currentView) {
      case 'chats':
        return (
          <div className="flex-1 flex flex-col h-full px-3 sm:px-4 lg:px-6 py-2 sm:py-4">
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
            onContinueConversation={handleContinueConversation}
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
              holiday={holiday}
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
    <main className="h-dvh w-screen overflow-hidden fixed inset-0">
      <GlassContainer className="h-full w-full flex flex-col rounded-none lg:m-4 lg:h-[calc(100dvh-2rem)] lg:w-[calc(100vw-2rem)] lg:rounded-3xl overflow-hidden">
        {/* Fixed Header - never scrolls */}
        <div className="shrink-0">
          <Header
            onNewChat={handleNewChat}
            onSearch={handleSearch}
            onGrid={handleGrid}
            onShare={handleShare}
            onBack={handleBack}
            showBackButton={currentView !== 'home'}
            showShareButton={!!currentChatId && currentChat?.provider !== 'webllm'}
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
          <ChatProviderSelector
            provider={chatProvider}
            modelId={localModelId}
            disabled={isLoading}
            onProviderChange={setChatProvider}
            onModelChange={setLocalModelId}
          />
          <MessageInput
            value={message}
            onChange={setMessage}
            onSend={handleSendMessage}
            onAddClick={handleAddClick}
            onHistoryClick={handleHistoryClick}
            disabled={false}
            isStreaming={isLoading}
            className="md:max-w-[50vw] mx-auto"
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
