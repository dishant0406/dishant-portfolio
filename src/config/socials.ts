import config from "@/config/config.json";
import type { SocialLink } from "@/config/types";

export const socialSectionConfig = { title: config.socials.title };
export const socialsConfig = config.socials.items as SocialLink[];
