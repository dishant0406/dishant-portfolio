'use client';

import { formatDate, formatRelativeTime } from '@/store/useAppStore';
import { Chat } from '@/types';
import { Calendar, ChevronDown, Clock, MoreVertical, Search, Share2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface ChatMenuDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: () => void;
  onDelete: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

function ChatMenuDropdown({ isOpen, onClose, onShare, onDelete, anchorRef }: ChatMenuDropdownProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.right - 140 // 140px is min-width of dropdown
      });
    }
  }, [isOpen, anchorRef]);

  if (!isOpen) return null;
  
  // Check if we're in browser environment for portal
  if (typeof window === 'undefined') return null;
  
  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[9999]" 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
      />
      <div 
        ref={dropdownRef}
        className="fixed bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-800 py-2 min-w-[140px] z-[10000]"
        style={{ top: position.top, left: position.left }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors text-gray-700 dark:text-gray-300 flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            onClose();
          }}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors text-red-600 dark:text-red-400 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </>,
    document.body
  );
}

interface ChatItemExpandedProps {
  chat: Chat;
  onSelect: (chatId: string) => void;
  onShare?: (chatId: string) => void;
  onDelete?: (chatId: string) => void;
  isMenuOpen: boolean;
  onMenuToggle: (chatId: string | null) => void;
}

function ChatItemExpanded({ chat, onSelect, onShare, onDelete, isMenuOpen, onMenuToggle }: ChatItemExpandedProps) {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  
  return (
    <div 
      onClick={() => onSelect(chat.id)}
      className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-gray-100 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 cursor-pointer hover:shadow-md dark:hover:bg-neutral-800/80 transition-all"
    >
      {/* Date */}
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(chat.createdAt)}</span>
      </div>
      
      {/* Title */}
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {chat.title}
      </h3>
      
      {/* Description */}
      {chat.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-3">
          {chat.description}
        </p>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm">{formatRelativeTime(chat.updatedAt)}</span>
        </div>
        
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onShare?.(chat.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              ref={menuButtonRef}
              onClick={() => onMenuToggle(isMenuOpen ? null : chat.id)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <ChatMenuDropdown
              isOpen={isMenuOpen}
              onClose={() => onMenuToggle(null)}
              onShare={() => onShare?.(chat.id)}
              onDelete={() => onDelete?.(chat.id)}
              anchorRef={menuButtonRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChatItemCompactProps {
  chat: Chat;
  onSelect: (chatId: string) => void;
  onShare?: (chatId: string) => void;
  onDelete?: (chatId: string) => void;
  isMenuOpen: boolean;
  onMenuToggle: (chatId: string | null) => void;
}

function ChatItemCompact({ chat, onSelect, onShare, onDelete, isMenuOpen, onMenuToggle }: ChatItemCompactProps) {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  
  return (
    <div 
      onClick={() => onSelect(chat.id)}
      className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-gray-100 dark:border-neutral-800 rounded-xl px-4 py-3 cursor-pointer hover:shadow-md dark:hover:bg-neutral-800/80 transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate flex-1">
          {chat.title}
        </h3>
        
        <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <Calendar className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">{formatDate(chat.createdAt)}</span>
          </div>
          <div className="relative">
            <button
              ref={menuButtonRef}
              onClick={() => onMenuToggle(isMenuOpen ? null : chat.id)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <ChatMenuDropdown
              isOpen={isMenuOpen}
              onClose={() => onMenuToggle(null)}
              onShare={() => onShare?.(chat.id)}
              onDelete={() => onDelete?.(chat.id)}
              anchorRef={menuButtonRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ChatsListViewProps {
  chats: Chat[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectChat: (chatId: string) => void;
  onShareChat?: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  className?: string;
}

export function ChatsListView({
  chats,
  searchQuery,
  onSearchChange,
  onSelectChat,
  onShareChat,
  onDeleteChat,
  className = '',
}: ChatsListViewProps) {
  const [sortBy, setSortBy] = useState<'recent' | 'oldest'>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);

  const handleMenuToggle = (chatId: string | null) => {
    setOpenMenuChatId(chatId);
  };

  const sortedChats = [...chats].sort((a, b) => {
    if (sortBy === 'recent') {
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
    return a.updatedAt.getTime() - b.updatedAt.getTime();
  });

  return (
    <div className={`flex flex-col h-full max-w-3xl mx-auto ${className}`}>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
          Chats <span className="text-gray-400 dark:text-gray-500 font-normal">({chats.length})</span>
        </h2>
        
        {/* Search and Sort */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial">
            <div className="flex items-center gap-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-gray-200 dark:border-neutral-800 rounded-full px-4 py-2.5 min-w-[180px] sm:min-w-[220px]">
              <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search for chats"
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-gray-200 dark:border-neutral-800 rounded-full text-sm text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
            >
              <span>Sort by</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showSortDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowSortDropdown(false)} 
                />
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-800 py-2 min-w-[140px] z-20">
                  <button
                    onClick={() => {
                      setSortBy('recent');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors ${
                      sortBy === 'recent' ? 'text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-neutral-800' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Most Recent
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('oldest');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors ${
                      sortBy === 'oldest' ? 'text-gray-900 dark:text-white font-medium bg-gray-50 dark:bg-neutral-800' : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Oldest First
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-auto space-y-3">
        {sortedChats.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <p className="text-base">No chats found</p>
            <p className="text-sm mt-1">Start a new conversation</p>
          </div>
        ) : (
          sortedChats.map((chat, index) => (
            index === 0 ? (
              <ChatItemExpanded
                key={chat.id}
                chat={chat}
                onSelect={onSelectChat}
                onShare={onShareChat}
                onDelete={onDeleteChat}
                isMenuOpen={openMenuChatId === chat.id}
                onMenuToggle={handleMenuToggle}
              />
            ) : (
              <ChatItemCompact
                key={chat.id}
                chat={chat}
                onSelect={onSelectChat}
                onShare={onShareChat}
                onDelete={onDeleteChat}
                isMenuOpen={openMenuChatId === chat.id}
                onMenuToggle={handleMenuToggle}
              />
            )
          ))
        )}
      </div>
    </div>
  );
}

export default ChatsListView;
