'use client';

import { Briefcase, Code, FolderGit2 } from 'lucide-react';
import { ReactNode } from 'react';
import { Button, Card } from './ui';

interface FeatureCardProps {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onAction?: (id: string) => void;
  className?: string;
}

// Icon mapping for portfolio icons
const iconMap = {
  projects: FolderGit2,
  skills: Code,
  experience: Briefcase,
};

export function FeatureCard({
  id,
  icon,
  title,
  description,
  buttonText,
  onAction,
  className = '',
}: FeatureCardProps) {
  return (
    <Card
      className={`flex flex-col h-full w-full sm:min-w-[180px] sm:max-w-[220px] lg:min-w-[200px] lg:max-w-[240px] ${className}`}
      padding="sm"
    >
      {/* Icon */}
      <div className="mb-2 sm:mb-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 flex items-center justify-center">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>

      {/* Description */}
      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2 sm:mb-3 flex-grow line-clamp-2 sm:line-clamp-3">
        {description}
      </p>

      {/* Action Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onAction?.(id)}
        className="w-full justify-center text-xs bg-transparent dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700"
      >
        {buttonText}
      </Button>
    </Card>
  );
}

// Pre-configured feature cards container
interface FeatureCardsProps {
  cards: Array<{
    id: string;
    icon: 'projects' | 'skills' | 'experience';
    title: string;
    description: string;
    buttonText: string;
  }>;
  onCardAction?: (cardId: string) => void;
  className?: string;
}

export function FeatureCards({
  cards,
  onCardAction,
  className = '',
}: FeatureCardsProps) {
  const getIcon = (iconType: 'projects' | 'skills' | 'experience') => {
    const IconComponent = iconMap[iconType];
    return <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />;
  };

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-3xl ${className}`}
    >
      {cards.map((card) => (
        <FeatureCard
          key={card.id}
          id={card.id}
          icon={getIcon(card.icon)}
          title={card.title}
          description={card.description}
          buttonText={card.buttonText}
          onAction={onCardAction}
        />
      ))}
    </div>
  );
}

export default FeatureCard;
