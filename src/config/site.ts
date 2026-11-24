import config from "@/config/config.json";
import type { AboutGreetings, AboutItem, FooterConfig } from "@/config/types";

// The one place that reads the site-wide parts of config.json.
export const siteConfig = {
  meta: config.site,
  personal: config.person,
  about: { title: "Hello there !" },
  // Header buttons. These are interface text, not personal data.
  banner: {
    openSourceUrl: `https://github.com/${config.person.githubUsername}/dishant-portfolio`,
    openSourceTooltip: "View the source on GitHub",
    themeToggleLabel: "Toggle theme",
    themeShortcut: "D",
    themeTooltip: "Toggle theme",
    switchAudioSrc: "/switch.mp3",
  },
};

export const aboutGreetings: AboutGreetings = config.about.greetings;
export const aboutItems = config.about.items as AboutItem[];
export const footerConfig: FooterConfig = config.footer;
