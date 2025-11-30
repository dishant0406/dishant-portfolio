'use client';

import { useTheme } from '@/hooks';
import { ArrowLeft, Grid3X3, Moon, Plus, Share2, Sun } from 'lucide-react';
import { Button, IconButton } from './ui';

interface HeaderProps {
  onNewChat?: () => void;
  onSearch?: () => void;
  onGrid?: () => void;
  onShare?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  showShareButton?: boolean;
  isSearchOpen?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onSearchClose?: () => void;
  onSearchOpen?: () => void;
  className?: string;
}

export function Header({
  onNewChat,
  onGrid,
  onShare,
  onBack,
  showBackButton = false,
  showShareButton = false,
  className = '',
}: HeaderProps) {
  const { toggleTheme, isDark, mounted } = useTheme();

  return (
    <header
      className={`
        flex items-center justify-between
        px-3 sm:px-4 lg:px-6 py-3 sm:py-4
        ${className}
      `}
    >
      {/* Left Section */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
        {/* Back Button */}
        {showBackButton && (
          <IconButton
            icon={<ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
            onClick={onBack}
            variant="ghost"
            size="sm"
            ariaLabel="Go back"
            className="w-8 h-8 sm:w-9 sm:h-9 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          />
        )}



        {/* New Chat Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onNewChat}
          className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">New Chat</span>
          <span className="xs:hidden">New</span>
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
        {/* Theme Toggle Button */}
        {mounted && (
          <IconButton
            icon={isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            onClick={toggleTheme}
            size="sm"
            ariaLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 sm:w-9 sm:h-9 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700"
          />
        )}

        {/* Grid Button */}
        <IconButton
          icon={<Grid3X3 className="w-4 h-4 sm:w-5 sm:h-5" />}
          onClick={onGrid}
          size="sm"
          ariaLabel="View all chats"
          className="w-8 h-8 sm:w-9 sm:h-9 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700"
        />

        {/* Share Button - Only shown when there's an active chat */}
        {showShareButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9 bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 flex items-center gap-1"
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Share
          </Button>
        )}
      </div>
    </header>
  );
}

export default Header;
