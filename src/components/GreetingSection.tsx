'use client';

import { Sparkles } from 'lucide-react';

interface GreetingSectionProps {
  greeting?: string;
  userName?: string;
  subtitle?: string;
  className?: string;
}

export function GreetingSection({
  greeting = 'Hi',
  userName = 'there',
  subtitle = "I'm Dishant Sharma. Ask me anything about my work, skills, or experience!",
  className = '',
}: GreetingSectionProps) {
  return (
    <div className={`flex flex-col items-center text-center px-4 ${className}`}>
      {/* Sparkle Icon */}
      <div className="mb-2 sm:mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-50 dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
        </div>
      </div>

      {/* Greeting */}
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-gray-900 dark:text-white mb-1">
        <span className="font-normal">{greeting},</span>{' '}
        <span className="text-gray-500 dark:text-gray-400">{userName}! 👋</span>
      </h1>

      {/* Subtitle */}
      <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm max-w-xs sm:max-w-md">{subtitle}</p>
    </div>
  );
}

export default GreetingSection;
