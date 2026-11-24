import { BottomNav } from "@/components/landing/bottom-nav";
import { BackToTop } from "@/components/shared/back-to-top";
import { FrameGutters } from "@/components/shared/frame-gutters";
import { SiteHeader } from "@/components/shared/site-header";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";
import { fetchProjects } from "@/lib/github/projects";
import { cn } from "@/lib/utils";
import { personJsonLd, websiteJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import type { Metadata, Viewport } from "next";
import { dmSans, geistMono, instrumentSerif } from "./fonts";
import "./globals.css";

const { meta, personal } = siteConfig;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(meta.url),
  title: { default: meta.title, template: meta.titleTemplate },
  description: meta.description,
  keywords: meta.keywords,
  authors: [{ name: personal.fullName, url: meta.url }],
  creator: personal.fullName,
  publisher: personal.fullName,
  classification: meta.classification,
  category: meta.category,
  alternates: { canonical: meta.url },
  openGraph: {
    type: "website",
    locale: meta.locale,
    url: meta.url,
    title: meta.title,
    description: meta.description,
    siteName: meta.shortTitle,
    images: [meta.ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: meta.title,
    description: meta.description,
    images: [meta.ogImage.url],
    creator: meta.twitterCreator,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const projects = await fetchProjects();

  return (
    <html
      lang="en"
      className={cn("bg-background font-sans", dmSans.variable, instrumentSerif.variable)}
      suppressHydrationWarning
    >
      <head>
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="f85088d6-f79d-45a1-844e-45417e551ac4"
        />
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        <noscript>
          <style>{`.no-js-visible { opacity: 1 !important; transform: none !important; filter: none !important; stroke-dashoffset: 0 !important; stroke-dasharray: none !important; }`}</style>
        </noscript>
        <JsonLd data={personJsonLd()} />
        <JsonLd data={websiteJsonLd()} />
        <ThemeProvider>
          <TooltipProvider>
            <div data-site-chrome="" className="contents">
              <SiteHeader projects={projects} />
              <FrameGutters />
            </div>
            <div data-site-frame="" className="relative mx-auto w-full max-w-[var(--frame-max-w)]">
              <div data-site-surface="" className="relative w-full border-x bg-muted/20">
                {children}
              </div>
              <div data-site-chrome="" className="contents">
                <BottomNav />
                <BackToTop />
              </div>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
