'use client';

import { Code, FileText, FolderGit2 } from 'lucide-react';
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
  resume: FileText,
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
      className={`flex flex-col h-full w-full sm:min-w-45 sm:max-w-55 lg:min-w-50 lg:max-w-60 ${className}`}
      padding="sm"
    >
      {/* Icon */}
      <div className="mb-2 sm:mb-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-secondary border border-border flex items-center justify-center">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-1">{title}</h3>

      {/* Description */}
      <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed mb-2 sm:mb-3 grow line-clamp-2 sm:line-clamp-3">
        {description}
      </p>

      {/* Action Button */}
      <Button
        variant="primary"
        size="sm"
        onClick={() => onAction?.(id)}
        className="w-full justify-center text-xs"
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
    icon: 'projects' | 'skills' | 'resume';
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
  const getIcon = (iconType: 'projects' | 'skills' | 'resume') => {
    const IconComponent = iconMap[iconType];
    return <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-foreground/80" />;
  };

  return (
    <>
      {/* Mobile: Horizontal scroll container with proper padding */}
      <div
        className={`sm:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 w-full max-w-full ${className}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {cards.map((card, index) => (
          <div 
            key={card.id} 
            className={`snap-center shrink-0 w-[75vw] max-w-65 ${index === 0 ? 'ml-0' : ''} ${index === cards.length - 1 ? 'mr-0' : ''}`}
          >
            <FeatureCard
              id={card.id}
              icon={getIcon(card.icon)}
              title={card.title}
              description={card.description}
              buttonText={card.buttonText}
              onAction={onCardAction}
            />
          </div>
        ))}
      </div>
      
      {/* Desktop/Tablet: Grid layout */}
      <div
        className={`hidden sm:grid sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-3xl ${className}`}
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
    </>
  );
}

export default FeatureCard;
