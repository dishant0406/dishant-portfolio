import { About } from "@/components/landing/about";
import { Bookmarks } from "@/components/landing/bookmarks";
import { Bookshelf } from "@/components/landing/bookshelf";
import { Certifications } from "@/components/landing/certifications";
import { Experience } from "@/components/landing/experience";
import { Footer } from "@/components/landing/footer";
import { Insights } from "@/components/landing/insights";
import { GitHubSection } from "@/components/landing/github-section";
import { Hero } from "@/components/landing/hero";
import { HomeProjectExplorer } from "@/components/landing/home-project-explorer";
import { HomeSectionRail } from "@/components/landing/home-section-rail";
import { ProfileBanner } from "@/components/landing/profile-banner";
import Social from "@/components/landing/social";
import { Skills } from "@/components/landing/skills";
import { Articles } from "@/components/landing/articles";
import { GitSkeleton } from "@/components/skeletons/github-skeleton";
import { JsonLd } from "@/components/JsonLd";
import { PixelDissolve } from "@/components/ui/pixel-dissolve";
import { SideNote } from "@/components/shared/side-note";
import { booksConfig } from "@/config/books";
import config from "@/config/config.json";
import { experienceConfig } from "@/config/experience";
import { projectsSectionConfig } from "@/config/projects";
import { fetchAllPosts } from "@/lib/api/devto";
import { profilePageJsonLd } from "@/lib/seo";
import { fetchProjects } from "@/lib/github/projects";
import type { BlogPost } from "@/lib/types/blog";
import { sectionNotes, sectionOrder } from "@/config/section-notes";
import type { Project, SectionId } from "@/config/types";
import { Suspense } from "react";

// The token is read on every request, not at build time: the Docker build has no
// secrets, so a static page would never show the GitHub section.
export const dynamic = "force-dynamic";

// A section shows only when it has something to show. The GitHub section also
// needs a token, because the contribution graph comes from the GitHub GraphQL API.
function getHasContent(projectCount: number, articleCount: number): Record<SectionId, boolean> {
  return {
    projects: projectCount > 0,
    experience: experienceConfig.length > 0,
    articles: articleCount > 0,
    socials: config.socials.items.length > 0,
    skills: config.skills.items.length > 0,
    about: config.about.items.length > 0,
    insights: config.insights.enabled,
    github: config.github.enabled && Boolean(process.env.PROFILE_G_TOKEN),
    bookshelf: booksConfig.length > 0,
    bookmarks: config.bookmarks.items.length > 0,
    certifications: config.certifications.items.length > 0,
  };
}

// The explorer reads the short line under each name as `subtitle`.
function explorerProjects(projects: Project[]) {
  return projects.map((project) => ({ ...project, subtitle: project.tagline }));
}

const sectionLabels: Record<SectionId, string> = {
  projects: "Projects",
  experience: "Experience",
  socials: "Socials",
  skills: "Stack",
  about: "About",
  insights: "Insights",
  github: "GitHub",
  articles: "Articles",
  bookshelf: "Bookshelf",
  bookmarks: "Bookmarks",
  certifications: "Certificates",
};

function renderSection(id: SectionId, projects: Project[], posts: BlogPost[]) {
  switch (id) {
    case "projects":
      return <HomeProjectExplorer projects={explorerProjects(projects)} title={projectsSectionConfig.title} />;
    case "experience":
      return <Experience />;
    case "socials":
      return <Social />;
    case "skills":
      return <Skills />;
    case "about":
      return <About />;
    case "insights":
      return (
        <Suspense fallback={null}>
          <Insights />
        </Suspense>
      );
    case "github":
      return (
        <Suspense fallback={<GitSkeleton />}>
          <GitHubSection />
        </Suspense>
      );
    case "articles":
      return <Articles posts={posts.slice(0, config.articles.limit)} total={posts.length} />;
    case "bookshelf":
      return <Bookshelf books={booksConfig} />;
    case "bookmarks":
      return <Bookmarks />;
    case "certifications":
      return <Certifications />;
  }
}

export default async function Home() {
  const projects = await fetchProjects();
  const posts = await fetchAllPosts().catch(() => []);
  const hasContent = getHasContent(projects.length, posts.length);
  const visibleSections = sectionOrder.filter((id) => hasContent[id]);

  return (
    <>
      <JsonLd data={profilePageJsonLd()} />
      <main
        id="main-content"
        className="relative flex min-h-dvh flex-col gap-y-4 overflow-x-clip border-x bg-background pt-0 xl:overflow-x-visible"
      >
        <div id="hero" className="bg-background scroll-mt-20">
          <ProfileBanner />
          <Hero />
        </div>
        {visibleSections.map((id) => {
          const note = sectionNotes[id];
          return (
            <div key={id} id={id} className="relative bg-background scroll-mt-20">
              {note && <SideNote side={note.side}>{note.text}</SideNote>}
              {renderSection(id, projects, posts)}
            </div>
          );
        })}
      </main>
      <Footer />
      <HomeSectionRail
        items={[
          { id: "hero", label: "Top" },
          ...visibleSections.map((id) => ({ id, label: sectionLabels[id] })),
        ]}
      />
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-[var(--frame-max-w)]">
        <div aria-hidden="true" className="bottom-blur" />
        <PixelDissolve />
      </div>
    </>
  );
}
