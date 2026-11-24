"use client";

import { ArrowUpRight, ArrowUpRightCircle } from "@/components/shared/site-icons";
import config from "@/config/config.json";
import type { BlogPost } from "@/lib/types/blog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

const MARQUEE_SPEED = 64;
const MARQUEE_SPEED_HOVER = 24;
const MARQUEE_GAP = 15;
/* Must match the slide's w-85 / md:w-87.5 classes. */
const SLIDE_WIDTH = 340;
const SLIDE_WIDTH_MD = 350;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/* One copy of the row plus the gap that follows it, at the shared px/s. */
function marqueeDuration(count: number, slideWidth: number) {
  return (count * (slideWidth + MARQUEE_GAP)) / MARQUEE_SPEED;
}

/* The marquee is a CSS animation, so hover only changes its playback rate
   instead of writing a transform every frame. */
function setPlaybackRate(element: HTMLElement, rate: number) {
  for (const animation of element.getAnimations()) {
    animation.playbackRate = rate;
  }
}

function handlePointerEnter(event: ReactPointerEvent<HTMLDivElement>) {
  if (event.pointerType !== "mouse") return;
  setPlaybackRate(event.currentTarget, MARQUEE_SPEED_HOVER / MARQUEE_SPEED);
}

function handlePointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
  if (event.pointerType !== "mouse") return;
  setPlaybackRate(event.currentTarget, 1);
}

function ArticleSlide({ post }: { post: BlogPost }) {
  return (
    <figure className="group relative flex min-h-32 w-85 shrink-0 flex-col border-x border-border px-4 py-3.5 transition-colors hover:bg-muted/10 md:w-87.5">
      <div className="blueprint-bg pointer-events-none absolute inset-0 opacity-50 transition-opacity group-hover:opacity-100" />

      <Link
        href={`/blog/${post.slug}`}
        className="absolute inset-0 z-20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/20"
        aria-label={`Read ${post.title}`}
      />

      <div className="relative z-10 flex flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug tracking-tight transition-colors group-hover:text-primary">
          {post.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
          {post.brief}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3 font-mono text-[10px] tracking-wider text-muted-foreground/60">
          <span className="truncate">
            {dateFormatter.format(new Date(post.publishedAt))} · {post.readTimeInMinutes} min read
          </span>
          <ArrowUpRight className="size-3.5 shrink-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </div>
    </figure>
  );
}

function ArticlesTrack({
  items,
  reverse = false,
  borderTop = true,
  paused = false,
}: {
  items: BlogPost[];
  reverse?: boolean;
  borderTop?: boolean;
  paused?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-clip border-b border-border",
        borderTop && "border-t",
      )}
    >
      <div
        className="card-marquee"
        data-reverse={reverse ? "true" : undefined}
        data-paused={paused ? "true" : undefined}
        style={
          {
            "--marquee-duration": `${marqueeDuration(items.length, SLIDE_WIDTH)}s`,
            "--marquee-duration-md": `${marqueeDuration(items.length, SLIDE_WIDTH_MD)}s`,
          } as CSSProperties
        }
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 gap-[15px] pr-[15px]">
            {items.map((post) => (
              <ArticleSlide key={`${copy}-${post.slug}`} post={post} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The most recent articles in two rows that scroll in opposite directions. */
export function Articles({ posts, total }: { posts: BlogPost[]; total: number }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const split = Math.ceil(posts.length / 2);
  const top = posts.slice(0, split);
  const bottom = posts.slice(split);

  return (
    <section ref={sectionRef} className="border-t border-dashed pt-8">
      <h2 className="no-js-visible section-heading mb-3">
        {config.articles.title}
      </h2>
      <div className="relative mb-[15px] flex flex-col">
        <ArticlesTrack items={top} paused={!inView} />
        {bottom.length > 0 && (
          <ArticlesTrack
            items={bottom}
            reverse
            borderTop={false}
            paused={!inView}
          />
        )}
        {/* pointer-events-none: these sit at z-10 above the slider and would
            otherwise swallow interaction in the outer 32px on each side. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent z-10" />
      </div>

      <div className="flex justify-center items-center border-y py-4">
        <Link
          href="/blog"
          className="flex items-center gap-2 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {`Read all ${total} articles`}
          <ArrowUpRightCircle className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
