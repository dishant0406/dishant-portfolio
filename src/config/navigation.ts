import config from "@/config/config.json";
import type { SiteNavigationItem } from "@/config/types";

export const navigationConfig = {
  label: "Site navigation",
  menu: "Menu",
  close: "Close menu",
  search: "Open command palette",
  backToTop: "Back to top",
  sitemap: "Sitemap",
  sitemapHref: "/sitemap.xml",
  githubLabel: "View the source on GitHub (opens in a new tab)",
};

export const navigationItems = config.navigation as SiteNavigationItem[];
