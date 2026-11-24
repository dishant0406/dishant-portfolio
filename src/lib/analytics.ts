// Sends a custom event to Umami. Does nothing when the Umami script is not loaded.
export function trackEvent(name: string, data?: Record<string, unknown>) {
  (window as unknown as { umami?: { track: (n: string, d?: unknown) => void } }).umami?.track(name, data);
}
