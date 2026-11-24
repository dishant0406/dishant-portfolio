"use client";

import { ArrowUp } from "@/components/shared/site-icons";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { navigationConfig } from "@/config/navigation";

export function BackToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      const remaining =
        document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      setVisible(window.scrollY > 0 && remaining <= 160);
    };

    const observer = new ResizeObserver(updateVisibility);
    observer.observe(document.documentElement);
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label={navigationConfig.backToTop}
      onClick={() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }}
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-[60] flex size-11 items-center justify-center rounded-full bg-transparent text-muted-foreground opacity-100 hover:bg-transparent hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="liquid-glass pointer-events-none absolute size-[26.4px] rounded-full" />
      <ArrowUp className="relative size-[16px]" />
    </button>
  );
}
