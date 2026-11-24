import { ArrowDownRight, ArrowUpRight } from "@/components/shared/site-icons";
import config from "@/config/config.json";
import { getInsights, type Metric } from "@/lib/github/insights";
import { cn } from "@/lib/utils";

const number = new Intl.NumberFormat("en-GB");
const percentage = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** The change since the 7 days before. A start from zero reads as "New". */
function compare({ value, before }: Metric) {
  if (value === null || before === null || before === undefined) return null;
  if (before === 0) return value > 0 ? { label: "New", up: true } : null;
  const change = ((value - before) / before) * 100;
  if (change === 0) return null;
  return { label: `${percentage.format(Math.abs(change))}%`, up: change > 0 };
}

function MetricCard({ label, metric }: { label: string; metric: Metric }) {
  const trend = compare(metric);

  return (
    <div className="group relative min-w-0 px-4.5 py-3.5 transition-colors hover:bg-muted/10">
      <div
        aria-hidden="true"
        className="blueprint-bg pointer-events-none absolute inset-0 opacity-50 transition-opacity group-hover:opacity-100"
      />
      <div className="relative z-10">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span
            className={cn(
              "text-[22px]/7 font-medium tracking-tight tabular-nums text-foreground",
              metric.value === null && "text-sm text-muted-foreground",
            )}
          >
            {metric.value === null ? "No data" : number.format(metric.value)}
          </span>
          {trend && (
            <span
              title="Compared with the previous 7 days"
              className={cn(
                "inline-flex items-center gap-0.5 font-mono text-[11px] tabular-nums",
                trend.up ? "text-success" : "text-destructive",
              )}
            >
              {trend.up ? (
                <ArrowUpRight className="size-3 shrink-0" />
              ) : (
                <ArrowDownRight className="size-3 shrink-0" />
              )}
              <span className="sr-only">{trend.up ? "Up " : "Down "}</span>
              {trend.label}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export async function Insights() {
  const insights = await getInsights(config.person.githubUsername);
  const cards = [
    { label: "Contributions", metric: insights.contributions },
    { label: "Active days", metric: insights.activeDays },
    { label: "Followers", metric: insights.followers },
    { label: "Stars earned", metric: insights.stars },
  ];

  return (
    <section
      aria-labelledby="insights-heading"
      className="border-t border-dashed pt-6"
    >
      <h2 id="insights-heading" className="section-heading">
        {config.insights.title}
      </h2>
      <div
        role="group"
        aria-label="GitHub activity over the last 7 days"
        className="mt-2.5 grid grid-cols-2 border-y border-border sm:grid-cols-4"
      >
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>
    </section>
  );
}
