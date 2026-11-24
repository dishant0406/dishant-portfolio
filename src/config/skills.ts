import config from "@/config/config.json";
import type { SkillCategoryConfig, SkillItem } from "@/config/types";

export const skillsSectionConfig = {
  title: config.skills.title,
  categories: config.skills.categories as SkillCategoryConfig[],
};
export const skillsConfig = config.skills.items as SkillItem[];
