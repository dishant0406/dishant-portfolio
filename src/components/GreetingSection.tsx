'use client';

import { Sparkles } from 'lucide-react';

interface Holiday {
  name: string;
  date: string;
  emoji: string;
}

interface GreetingSectionProps {
  greeting?: string;
  userName?: string;
  subtitle?: string;
  city?: string;
  weather?: { temp: number; emoji: string; description: string };
  holiday?: Holiday;
  className?: string;
}

export function GreetingSection({
  greeting = 'Hi',
  userName = 'there',
  subtitle = "I'm Dishant Sharma. Ask me anything about my work, skills, or experience!",
  city,
  weather,
  holiday,
  className = '',
}: GreetingSectionProps) {
  // Build a natural, personalized greeting
  const buildPersonalizedGreeting = () => {
    // If we have location data, create a more personalized greeting
    if (city && weather) {
      // "Good afternoon! It's partly cloudy in Bengaluru ⛅"
      const weatherLower = weather.description.toLowerCase();
      return (
        <>
          <span className="font-normal">{greeting}!</span>
          <span className="text-muted-foreground font-light ml-1.5">It&apos;s</span>
          <span className="text-muted-foreground font-light ml-1">{weatherLower}</span>
          <span className="text-muted-foreground font-light ml-1">in</span>
          <span className="text-muted-foreground ml-1">{city}</span>
          <span className="ml-1.5">{weather.emoji}</span>
        </>
      );
    }
    
    if (city) {
      // "Good morning from Bengaluru 📍"
      return (
        <>
          <span className="font-normal">{greeting}</span>
          <span className="text-muted-foreground font-light ml-1">from</span>
          <span className="text-muted-foreground ml-1">{city}</span>
          <span className="ml-1.5">📍</span>
        </>
      );
    }
    
    // Default greeting
    return (
      <>
        <span className="font-normal">{greeting},</span>
        <span className="text-muted-foreground ml-1">{userName}!</span>
        <span className="ml-1.5">👋</span>
      </>
    );
  };

  // Build holiday banner if there's an upcoming holiday
  const holidayBanner = holiday ? (
    <div className="mb-3 px-3 py-1.5 rounded-full bg-[linear-gradient(90deg,rgba(var(--color-warning),0.16),rgba(var(--color-tertiary),0.16))] border border-warning/40 inline-flex items-center gap-1.5">
      <span>{holiday.emoji}</span>
      <span className="text-xs text-warning font-medium">
        {holiday.name} coming up!
      </span>
    </div>
  ) : null;

  // Temperature badge if weather available
  const tempBadge = weather ? (
    <span className="ml-2 text-sm font-normal text-muted-foreground">
      {weather.temp}°C
    </span>
  ) : null;

  return (
    <div className={`flex flex-col items-center text-center px-4 ${className}`}>
      {/* Holiday Banner */}
      {holidayBanner}

      {/* Sparkle Icon */}
      <div className="mb-2 sm:mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary border border-border flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-foreground/80" />
        </div>
      </div>

      {/* Personalized Greeting */}
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-foreground mb-1 flex items-center flex-wrap justify-center">
        {buildPersonalizedGreeting()}
        {tempBadge}
      </h1>

      {/* Subtitle */}
      <p className="text-muted-foreground text-xs sm:text-sm max-w-xs sm:max-w-md mt-1">{subtitle}</p>
    </div>
  );
}

export default GreetingSection;
