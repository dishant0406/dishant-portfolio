import type { ComponentType, SVGProps } from "react";

export type SectionId =
  | "projects"
  | "socials"
  | "skills"
  | "experience"
  | "about"
  | "insights"
  | "github"
  | "articles"
  | "bookshelf"
  | "bookmarks"
  | "certifications";

export interface SectionNoteConfig {
  text: string;
  side: "left" | "right";
}

export interface AboutGreetings {
  morning: string;
  afternoon: string;
  evening: string;
}

export interface AboutItem {
  id: string;
  lead: string;
  illustration: "browser" | "notebook" | "plane";
  body: string;
}

export interface FooterConfig {
  quote: string;
  attribution: string;
  credit: string;
  iconCredit: { text: string; href: string };
  sceneryCredit: { text: string; href: string };
  earthCredit: { text: string; href: string };
}

export interface SkillCategoryConfig {
  id: string;
  label: string;
}

export type SkillIcon =
  | "nextjs"
  | "react"
  | "typescript"
  | "javascript"
  | "tailwind"
  | "nodejs"
  | "rust"
  | "express"
  | "graphql"
  | "postgresql"
  | "mongodb"
  | "redis";

export interface SkillItem {
  name: string;
  icon: SkillIcon;
  category: string;
}

export type SocialIcon = "github" | "x" | "linkedin" | "devto" | "gmail";

export interface SocialLink {
  id: string;
  platform: string;
  handle: string;
  href?: string;
  icon: SocialIcon;
  action?: "copy" | "external" | "mailto";
  copyValue?: string;
  shortcutKey?: string;
  tooltipDefault?: string;
}

export interface Project {
  id: string;
  title: string;
  tagline: string;
  description: string;
  image?: string;
  imageAlt?: string;
  liveUrl?: string;
  githubUrl?: string;
  year: number;
  category: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  location: string;
  summary?: string;
}

export type LinkCardIcon = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: number | string;
    color?: string;
  }
>;

export interface LinkItem {
  id: string;
  url: string;
  title: string;
  domain: string;
  date?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: { src: string; width: number; height: number; alt: string };
  spine: { src: string; height: number; width: number };
}

export interface SiteNavigationItem {
  id: string;
  label: string;
  href: string;
  icon: "home" | "stack" | "testimonial" | "sparkles";
}
