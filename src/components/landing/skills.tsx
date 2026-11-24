import { skillsConfig, skillsSectionConfig } from "@/config/skills";
import type { SkillIcon, SkillItem } from "@/config/types";
import { cn } from "@/lib/utils";
import JSIcon from "@/icons/js";
import NextjsIcon from "@/icons/nextjs";
import ReactIcon from "@/icons/react";
import TailwindIcon from "@/icons/tailwind";
import TSIcon from "@/icons/ts";
import type { ComponentType } from "react";
import {
  SiExpress,
  SiGraphql,
  SiMongodb,
  SiNodedotjs,
  SiPostgresql,
  SiRedis,
  SiRust,
} from "react-icons/si";

const skillIconMap: Record<SkillIcon, ComponentType<{ size: string }>> = {
  nextjs: NextjsIcon,
  react: ReactIcon,
  typescript: TSIcon,
  javascript: JSIcon,
  tailwind: TailwindIcon,
  nodejs: SiNodedotjs,
  express: SiExpress,
  graphql: SiGraphql,
  postgresql: SiPostgresql,
  mongodb: SiMongodb,
  redis: SiRedis,
  rust: SiRust,
};


function SkillChip({ skill }: { skill: SkillItem }) {
  const Icon = skillIconMap[skill.icon];

  // Deliberately no hover:/focus-visible: styles here. These chips are labels,
  // not controls: there is nothing to click and nothing to focus (a div with
  // no tabIndex can never receive focus, so a focus ring is unreachable CSS).
  // Styling them like interactive filter chips made users click them, which
  // PostHog then recorded as $dead_click. If these ever become filters or
  // links, restore the affordances along with the handler.
  const chipClasses =
    "no-js-visible inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1 text-sm text-muted-foreground";

  return (
    <div className={chipClasses} aria-label={skill.name}>
      <Icon size="18" />
      <span className="font-medium">{skill.name}</span>
    </div>
  );
}

export function Skills() {
  const skills = skillsConfig;
  const categories = skillsSectionConfig.categories;

  return (
    <section className="border-t border-dashed pt-6">
      <h2 className="no-js-visible section-heading">
        {skillsSectionConfig.title}
      </h2>
      {categories.map((category, groupIndex) => {
        const categorySkills = skills.filter(
          (skill) => skill.category === category.id,
        );

        if (categorySkills.length === 0) return null;

        return (
          <div
            key={category.id}
            className={cn(
              "flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-6 px-6 py-3.5 border-b",
              groupIndex === categories.length - 1 ? "border-none" : "",
            )}
          >
            <span className="shrink-0 w-36 font-mono text-xs tracking-wider text-muted-foreground">
              {`0${groupIndex + 1}`.padStart(2, "0") + " " + category.label}
            </span>

            <div className="flex flex-wrap gap-2 flex-1">
              {categorySkills.map((skill) => (
                <SkillChip key={skill.name} skill={skill} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
