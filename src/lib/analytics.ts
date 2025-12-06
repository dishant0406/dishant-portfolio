// Umami Analytics Utility
// https://umami.is/docs/track-events

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

type EventName =
  | 'message_sent'
  | 'feature_card_clicked'
  | 'chat_shared'
  | 'chat_deleted'
  | 'theme_toggled'
  | 'shared_chat_opened'
  | 'new_chat_created'
  | 'chat_selected'
  | 'resume_downloaded';

interface EventData {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track an event with Umami analytics
 * @param event - The event name to track
 * @param data - Optional data to send with the event
 */
export function trackEvent(event: EventName, data?: EventData): void {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(event, data);
  }
}

// Convenience functions for common events
export const analytics = {
  messageSent: (threadId?: string) => 
    trackEvent('message_sent', { threadId }),
  
  featureCardClicked: (cardType: string) => 
    trackEvent('feature_card_clicked', { cardType }),
  
  chatShared: (threadId: string) => 
    trackEvent('chat_shared', { threadId }),
  
  chatDeleted: (threadId: string) => 
    trackEvent('chat_deleted', { threadId }),
  
  themeToggled: (newTheme: 'light' | 'dark') => 
    trackEvent('theme_toggled', { newTheme }),
  
  sharedChatOpened: (threadId: string) => 
    trackEvent('shared_chat_opened', { threadId }),
  
  newChatCreated: () => 
    trackEvent('new_chat_created'),
  
  chatSelected: (threadId: string) => 
    trackEvent('chat_selected', { threadId }),
  
  resumeDownloaded: () => 
    trackEvent('resume_downloaded'),
};

export default analytics;
