'use client';

import {
  ChatView,
  ChatsListView,
  FeatureCards,
  GlassContainer,
  GreetingSection,
  Header,
  MessageInput,
} from '@/components';
import { getGreeting, useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';

export default function Home() {
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
    featureCards,
    setUser,
    setCurrentView,
    setIsSearchOpen,
    setSearchQuery,
    setChatSearchQuery,
    setMessage,
    setCurrentChatId,
    createNewChat,
    sendMessage,
    handleCardAction,
    deleteChat,
    getCurrentChat,
    getFilteredChats,
  } = useAppStore();

  // Update greeting based on time of day
  useEffect(() => {
    const greeting = getGreeting();
    setUser({ ...user, greeting });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNewChat = () => {
    setCurrentChatId(null);
    setCurrentView('home');
  };

  const handleSearch = () => {
    setIsSearchOpen(true);
  };

  const handleGrid = () => {
    setCurrentView('chats');
  };

  const handleShare = () => {
    console.log('Share clicked');
    // Add share functionality
  };

  const handleBack = () => {
    // Always go back to home
    setCurrentView('home');
    setCurrentChatId(null);
  };

  const handleSelectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleAddClick = () => {
    console.log('Add attachment clicked');
    // Add attachment functionality
  };

  const handleHistoryClick = () => {
    setCurrentView('chats');
  };

  const currentChat = getCurrentChat();
  const filteredChats = getFilteredChats();

  const renderContent = () => {
    switch (currentView) {
      case 'chats':
        return (
          <div className="flex-1 overflow-hidden px-3 sm:px-4 lg:px-6 py-2 sm:py-4">
            <ChatsListView
              chats={filteredChats}
              searchQuery={chatSearchQuery}
              onSearchChange={setChatSearchQuery}
              onSelectChat={handleSelectChat}
              onShareChat={(id) => console.log('Share chat:', id)}
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
        return (
          <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 lg:px-6 py-4 sm:py-6 min-h-0">
            <GreetingSection
              greeting={user.greeting || 'Hi'}
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
    <main className="h-screen w-screen overflow-hidden">
      <GlassContainer className="h-full w-full flex flex-col rounded-none lg:m-4 lg:h-[calc(100vh-2rem)] lg:w-[calc(100vw-2rem)] lg:rounded-3xl">
        {/* Header */}
        <Header
          onNewChat={handleNewChat}
          onSearch={handleSearch}
          onGrid={handleGrid}
          onShare={handleShare}
          onBack={handleBack}
          showBackButton={currentView !== 'home'}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchClose={() => {
            setIsSearchOpen(false);
            setSearchQuery('');
          }}
          onSearchOpen={() => setIsSearchOpen(true)}
        />

        {/* Main Content Area */}
        {renderContent()}

      </GlassContainer>
      
      {/* Message Input - absolute positioned at bottom */}
      <div className="fixed bottom-0 left-0 right-0 lg:bottom-4 lg:left-4 lg:right-4 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6 pt-2 z-50">
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
    </main>
  );
}
