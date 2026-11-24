"use client";

import {
  Contrast,
  Home,
  Layers,
  Link,
  Monitor,
  Moon,
  Sun,
} from "@/components/shared/site-icons";
import { FaGithub } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMemo } from "react";

import { PortfolioSticker } from "@/components/shared/portfolio-sticker";
import {
  CommandPalette,
  type CommandPaletteGroup,
  type CommandPalettePage,
} from "@/components/ui/command-palette";
import { navigationItems } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import type { Project } from "@/config/types";
import { socialsConfig } from "@/config/socials";
import { playCopySound } from "@/lib/copy-sound";

/**
 * The site-wide command palette, mounted once in the header. Pages, projects,
 * social links, theme controls and quick actions are a few keystrokes away.
 */
export function SiteCommandPalette({
  open,
  onOpenChange,
  projects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
}) {
  const router = useRouter();
  const { setTheme } = useTheme();

  const groups = useMemo<CommandPaletteGroup[]>(() => {
    const go = (href: string) => () => router.push(href);
    const openLink = (href: string) => () => window.open(href, "_blank");

    return [
      {
        label: "Navigate",
        items: navigationItems.map((item) => ({
          id: `go-${item.id}`,
          label: item.label,
          icon:
            item.id === "home" ? (
              <Home className="size-4" />
            ) : (
              <Layers className="size-4" />
            ),
          keywords: [item.id],
          onSelect: go(item.href),
        })),
      },
      {
        label: "Projects",
        items: projects
          .filter((project) => project.liveUrl ?? project.githubUrl)
          .map((project) => ({
            id: `project-${project.id}`,
            label: project.title,
            icon: <PortfolioSticker name="folder" className="size-4" />,
            badge: "external",
            keywords: ["project", project.category, project.id],
            onSelect: openLink((project.liveUrl ?? project.githubUrl) as string),
          })),
      },
      {
        label: "Socials",
        items: socialsConfig
          .filter((social) => social.href)
          .map((social) => ({
            id: `social-${social.id}`,
            label: social.platform,
            icon: <Link className="size-4" />,
            badge: "external",
            keywords: ["social", social.handle],
            onSelect: openLink(social.href as string),
          })),
      },
      {
        label: "Actions",
        items: [
          {
            id: "open-github",
            label: "Open GitHub",
            icon: <FaGithub className="size-4" />,
            badge: "external",
            keywords: ["repo", "source", "repository", "code"],
            onSelect: openLink(siteConfig.banner.openSourceUrl),
          },
          {
            id: "copy-url",
            label: "Copy site URL",
            icon: <Link className="size-4" />,
            keywords: ["link", "share", "address", "copy"],
            onSelect: () => {
              navigator.clipboard
                ?.writeText(siteConfig.meta.url)
                .then(() => playCopySound())
                .catch(() => {});
            },
          },
          {
            id: "change-theme",
            label: "Change theme…",
            icon: <Contrast className="size-4" />,
            keywords: ["dark", "light", "system", "appearance", "mode"],
            page: "theme",
          },
        ],
      },
    ];
  }, [router, projects]);

  const pages = useMemo<CommandPalettePage[]>(
    () => [
      {
        id: "theme",
        label: "Theme",
        placeholder: "Search themes…",
        items: [
          {
            id: "theme-light",
            label: "Light",
            icon: <Sun className="size-4" />,
            onSelect: () => setTheme("light"),
          },
          {
            id: "theme-dark",
            label: "Dark",
            icon: <Moon className="size-4" />,
            onSelect: () => setTheme("dark"),
          },
          {
            id: "theme-system",
            label: "System",
            icon: <Monitor className="size-4" />,
            onSelect: () => setTheme("system"),
          },
        ],
      },
    ],
    [setTheme],
  );

  return (
    <CommandPalette
      groups={groups}
      pages={pages}
      open={open}
      onOpenChange={onOpenChange}
      recents
      hotkey={false}
    />
  );
}
