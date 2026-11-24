import { experienceConfig, experienceSectionConfig } from "@/config/experience";

/** Work history. Each row looks like a row in the Work list. */
export function Experience() {
  return (
    <section className="border-t border-dashed pt-6">
      <h2 className="no-js-visible section-heading mb-3">
        {experienceSectionConfig.title}
      </h2>
      <ul className="flex flex-col px-4 pb-4 sm:px-6">
        {experienceConfig.map((item) => (
          <li key={item.id} className="rounded-sm px-3 py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium">
                {item.role}
                <span className="ml-2 font-normal text-muted-foreground">
                  {item.company}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {item.period}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.location}
              {item.summary ? ` · ${item.summary}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
