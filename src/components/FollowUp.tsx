'use client';

import { Sparkles } from 'lucide-react';
import { Card } from './ui';

interface FollowUpProps {
  title?: string;
  questions: string[];
  onSelect?: (question: string) => void;
  className?: string;
}

export function FollowUp({
  title = 'Follow up',
  questions,
  onSelect,
  className = '',
}: FollowUpProps) {
  if (!questions.length) return null;

  return (
    <Card
      padding="md"
      hover={false}
      className={`gap-3 mt-4 sm:gap-4 ${className}`}
    >
      <div className="flex items-center gap-2 text-foreground">
        <Sparkles className="w-4 h-4 text-foreground/80" />
        <span className="text-sm sm:text-base font-semibold tracking-tight">{title}</span>
      </div>

      <div className="flex flex-col gap-2">
        {questions.map((question, index) => (
          <button
            key={`${question}-${index}`}
            type="button"
            onClick={() => onSelect?.(question)}
            className="
              text-left text-sm sm:text-base text-muted-foreground
              rounded-xl border border-border/80 px-3 py-2.5
              bg-secondary/40 hover:bg-secondary/70 hover:text-foreground
              transition-colors duration-200
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40
            "
          >
            {question}
          </button>
        ))}
      </div>
    </Card>
  );
}

export default FollowUp;
