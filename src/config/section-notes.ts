import config from "@/config/config.json";
import type { SectionId, SectionNoteConfig } from "@/config/types";

export const sectionNotes = config.sections.notes as Partial<Record<SectionId, SectionNoteConfig>>;
export const sectionOrder = config.sections.order as SectionId[];
