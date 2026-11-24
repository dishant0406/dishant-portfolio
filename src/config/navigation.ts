import config from "@/config/config.json";
import type { SiteNavigationItem } from "@/config/types";

export const navigationConfig = {
  label: "Site navigation",
  menu: "Menu",
  close: "Close navigation",
  search: "Open command palette",
  backToTop: "Back to top",
  githubLabel: "View source on GitHub (opens in a new tab)",
};

export const navigationItems = config.navigation as SiteNavigationItem[];
