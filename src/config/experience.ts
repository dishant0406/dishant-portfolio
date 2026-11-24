import config from "@/config/config.json";
import type { ExperienceItem } from "@/config/types";

export const experienceSectionConfig = { title: config.experience.title };
export const experienceConfig = config.experience.items as ExperienceItem[];
