# Design decisions

## Blog refresh endpoint (`POST /api/revalidate`)

**What we chose.** One route, `src/app/api/revalidate/route.ts`. You call it after you publish on dev.to. It marks `/blog`, every `/blog/[slug]` page and `/sitemap.xml` as stale. The next visit rebuilds them from dev.to.

**Why.** The blog pages used `revalidate = 3600`. A new post could take up to an hour to show. The timer stays as a safety net, but now you do not have to wait for it.

**Auth.** A secret token in the `Authorization: Bearer` header, checked against `REVALIDATE_TOKEN`. If the variable is not set, the endpoint always says 401. So a missing secret closes it, never opens it. The compare uses `timingSafeEqual`.

**Why a separate token.** `INTERNAL_API_TOKEN` is for Next.js talking to Mastra. If we reused it, leaking one would open both. In production the token comes from Secret Manager (`revalidate-token`), wired in `.github/workflows/prod-deploy.yaml`.

**Why it works on Cloud Run.** The cache lives inside one server instance. The service is pinned to `maxScale: 1`, so there is only one instance and the clear reaches every visitor. If you ever raise `maxScale`, this endpoint only clears the instance that got the call. You would then need a shared cache.

**Rejected.**
- Rebuild and redeploy on each post: slow, and a deploy is a lot of work for one article.
- Cookie login like `/admin`: a script cannot easily log in. A bearer token is simpler for `curl`.
- Revalidate only one slug: more input to validate, and clearing all post pages costs nothing, because pages rebuild only when someone visits.

**Trade-off.** dev.to's own list cache (Fastly) can still serve old data for a while. See `src/lib/api/devto.ts`. If a new post does not show after a refresh, that is the likely cause, not this endpoint.

## Where the post list comes from, and our own cache

**What we chose.** `fetchAllPosts` in `src/lib/api/devto.ts` reads dev.to's authenticated list (`/api/articles/me/published`, via `client.articles.minePublished`). It keeps the result in our own cache (`unstable_cache`, tag `devto-posts`, one hour). `POST /api/revalidate` expires that tag first, then marks the pages stale.

**Why.** The public list (`/api/articles?username=...`) goes through dev.to's CDN. The copy our Cloud Run server reads was stale: the live sitemap had 84 posts while dev.to had 86. The authenticated list is private and is never cached by the CDN (checked: `Cache-Control: private`, no cache hits). We could not look at the server's side directly, so the CDN is the most likely cause, not a proven one. Adding a throwaway query value does not help, because the CDN ignores it.

**Why our own cache.** Without it, every page rebuild would call dev.to again. One cached list serves the blog page, recent posts and the sitemap, and the refresh endpoint can drop it on demand.

**Trade-off.** The authenticated list has no `edited_at`. So the sitemap's last-modified date for a post is its publish date. The post page still shows "Updated <date>", because it reads the single-post endpoint. The authenticated list also carries each post's full markdown, so the response is bigger.

**Fallback.** With no `DEVTO_API_KEY` (for example a local build), the code reads the public list instead.

## SEO audit fixes (November 2026)

**The main problem found.** 31 of 88 posts were not in Google. Search Console said "Discovered, currently not indexed" or "URL is unknown". The cause: those posts (all published after 2026-10-11) still said on dev.to that dev.to is the original. Basically Google saw two copies and trusted dev.to. The fix is not code. You run `pnpm devto:canonical`, which points each dev.to post back at the site. It must run after every new post.

**Blog list thumbnails use a fixed size.** `src/components/blog/BlogListItem.tsx` now passes `width={96}` and `height={96}` to the image, not `fill` plus `sizes`. Why: with `fill`, Next.js writes 16 image URLs per thumbnail into the HTML. With 88 posts that made `/blog` 627 KB. A fixed size writes 2 URLs. The page is now about 307 KB. Rejected: paging the list, because paging is what hid posts from Google before. Trade-off: the thumbnail is always loaded at 96px or 2x, which is fine because it is never shown bigger.

**Post titles have no "| Dishant Sharma" suffix.** `src/app/blog/[slug]/page.tsx` uses `title: { absolute: title }`. Why: Google shows about 60 characters. Post titles are already near that, so the suffix pushed them to 77 and got cut. Trade-off: the name is not in the browser tab for posts. Google shows the site name separately anyway.

**The post cover image loads first.** It now has `priority`, the real size (1000 by 420, what dev.to serves) and a `sizes` value. Why: the cover is the biggest thing on screen, and it was lazy-loaded, which makes the page feel slow to Google (LCP). The old 1280 by 720 numbers also made the browser ask for images up to 3840px wide.

**The homepage h1 is the line with the name.** In `src/components/GreetingSection.tsx` the greeting ("Good Evening! It's sunny in Delhi") is now a `<p>`, and the subtitle with "Dishant Sharma, a Full Stack Developer" is the `<h1>`. It looks the same. Why: the h1 tells Google what the page is about, and the greeting changes for every visitor and never had the name in it. The site sits at position 8.9 for "dishant sharma", so this matters.

**Homepage structured data is a ProfilePage plus a WebSite.** `profilePageJsonLd` and `websiteJsonLd` in `src/lib/seo.ts`. The Person block now sits inside the ProfilePage. Why: ProfilePage is the type Google reads for "this page is about one person", and WebSite gives it the site name.

**The post author carries name and url.** `blogPostingJsonLd` used to say only `author: { '@id': ... }`. The Person block with that id is only on the homepage, so on a post the id pointed at nothing. Now the author has `@type`, `name` and `url` too.

**Shared chat pages are noindex.** `/?chat=<id>` in `src/app/page.tsx` now sends `robots: { index: false, follow: true }`. Why: a shared chat is the homepage with another title. It adds thin copies to Google.

**Smaller things.** `/blog` has a real title and description, and an image for link previews (it had none, because setting `openGraph` on a page drops the images from the root layout). The homepage now has `og:url`.

**Looked at, not changed.**
- `http://` goes to `https://` with a 302, not a 301. That comes from Cloud Run, not from this code.
- The homepage is built on every request (it reads the visitor's city), so it cannot be cached. First byte took about 1.5 s. Fixing it means moving the greeting to the browser, which is a bigger change.
- The homepage has about 125 words and 2 links. A short "about" block with links to GitHub and top posts would help the name search.
- `userScalable: false` in `src/app/layout.tsx` stops pinch zoom. It is an accessibility problem, but it was likely set on purpose for the chat input.
- No `llms.txt`. There is no good proof yet that AI search tools read it.

## The refresh endpoint also fixes canonical URLs

**What we chose.** `POST /api/revalidate` now calls `syncCanonicalUrls` (`src/lib/api/devto.ts`) after it refreshes the pages. That function points each dev.to post's canonical URL at `https://dishantsharma.dev/blog/<slug>`.

**Why.** This step used to be a separate command, `pnpm devto:canonical`, and it was forgotten for a month. 31 posts stayed out of Google because of that. You already call the refresh endpoint after every post, so now the fix cannot be forgotten.

**Order.** Pages are refreshed first, canonicals second. So if dev.to is down, the blog still refreshes. The answer is then a 502 so a script notices.

**Cost.** One list call to dev.to on each run. Updates happen only for posts that are wrong, which is normally just the newest one.

**Rejected.**
- A scheduled job (cron): one more thing to set up and watch, and a new post would wait for the next run.
- A separate endpoint: a second command to remember, which is the problem we are removing.
- Deleting the laptop script: its `--dry-run` is still useful, and it checks that an update did not empty the post body.

**Trade-off.** The token for this endpoint can now make a write to dev.to. The write is fixed: it can only set the canonical URL to this site. The worst a leaked token can do is still small.

## The portfolio redesign (one config file)

Old entries above mention the chat, `/admin`, Mastra and `INTERNAL_API_TOKEN`. All of that is gone now. The blog, the refresh endpoint and the SEO work stay.

**The interface is built on open source MIT code instead of from scratch.** We took ready-made components, styles and motion code. The license text is in `THIRD_PARTY_LICENSES.md`. Why: the goal was a polished interface with every hover and animation. Reading minified code and guessing would never get every timing right. Using real code does.

**All content lives in `src/config/config.json`.** Basically, the JSON holds the data and the old `src/config/*.ts` files became thin readers. Each one imports the JSON and gives the shape the components already expected (`projects.ts`, `socials.ts`, `skills.ts`, and so on). Why: we did not have to rewrite the components, and you edit one file. Interface text (tooltips, aria labels) stays in the TypeScript files, because it is not personal data.

**A section hides itself when it has no data.** `getHasContent` in `src/app/page.tsx` checks each list. Testimonials, bookshelf, bookmarks and certificates start empty, so they do not show. We did not invent fake testimonials or books. The GitHub section also needs `PROFILE_G_TOKEN`.

**The home page is `force-dynamic`.** Why: the token is a secret, so the Docker build cannot see it. A page built at build time would never show the GitHub section. The GitHub call itself is cached for 15 minutes, so each visit does not hit GitHub.

**Fonts are self-hosted.** DM Sans, Instrument Serif, Geist Mono and Caveat are `.woff2` files in `src/app/fonts/`, loaded in `src/app/fonts.ts`. The reference site uses `next/font/google`. We kept the older rule from this repo: Google's font fetch can fail a build, and the blog pages are prerendered on every deploy.

**Left out on purpose.**
- The Components, Sponsor and Testimonials pages. They need the author's payment system and component registry.
- The Insights and Sponsors sections. They read from the author's own analytics product and payment provider.
- The author's personal logo, profile photos, footer artwork and visitor counter. The logo is now a pixel "D" drawn in `src/components/shared/logo.tsx`.
- The shadcn CLI import (`shadcn/tailwind.css`). We wrote the few variants it gives (`data-open`, `data-closed`, `data-selected`, `no-scrollbar`) in `src/app/globals.css`. This saved one big package.

**The blog sits inside the new frame.** `src/app/blog/layout.tsx` no longer draws its own header. The root layout gives the sticky header and the side gutters. The old `.blog-shell` was `position: fixed`. Now it flows in the page, with room on top for the header.

**Trade-off.** We now carry a lot of code we did not write, such as the wave canvas and the footer Earth. It is MIT, but we must maintain it. The small helpers in `src/lib/` were kept as they were.

## The blog uses the site style

**What we chose.** The blog pages now use the same look as the home page: DM Sans text, Instrument Serif italic headings, dashed section lines, `section-heading` bars, and the same row hover as the Work list. Basically, a post in the list is a Work row with a date on the right. `BlogList.tsx` groups posts by year with the same paper-tape year label.

**Why.** The first version only moved the old blog into the new frame. It still had its own fonts, red links and spacing, so it looked like a different site.

**Entry animation is plain CSS.** The `.rise` class in `src/app/globals.css` does the same fade, blur and rise as the hero. Why CSS and not `motion`: the blog pages are server components, and CSS needs no client code. `--rise-delay` staggers the parts. `prefers-reduced-motion` turns it off.

**The article body is styled by element.** dev.to sends ready-made HTML, so `.blog-content` in `src/app/globals.css` styles `h2`, `a`, `pre`, `table` and so on with the site tokens. Code blocks use `--card`. The old rule used `--color-code-bg`, which was never defined, so those blocks had no background.

**Removed.** The old blog fonts (Cormorant Garamond and Source Sans), their `.woff2` files, the old `.blog-*` classes, the blog footer links, and the unused `.prose` docs CSS from the copied design. The header already links to Home and Blog. The sitemap is listed in `robots.txt`.

**Trade-off.** We dropped the cover image in the list. A row is one line, like the Work list. The cover still shows on the post page.

## Interface icons come from the Solar set

**What we chose.** All interface icons (arrows, search, sun, moon, copy, close, home and so on) now come from the Solar icon set by 480 Design, through `@solar-icons/react`. We use the `linear` style. `src/components/shared/site-icons.tsx` is the one place that imports them. It gives each icon a short site name (for example `ArrowUpRight`) and hides it from screen readers. The rest of the code imports from that file only.

**Why one file.** If we change an icon or the style later, we change one line. It also keeps the old import names, so most components did not change.

**What we kept.** Brand logos (GitHub, X, LinkedIn, Gmail, DEV, TypeScript and the other stack logos) stay, because Solar has no brand logos. The stickers, the 404 drawings, the Earth and the About mascots are art, not icons, so they stay too.

**Removed.** `lucide-react` and `scribbles-icons`. Two small hand-drawn glyphs became Solar icons: the back-to-top arrow and the separator in the header.

**License.** Solar is CC BY 4.0, which needs a visible credit. The footer shows "Icons by Solar, 480 Design (CC BY 4.0)" with a link. The text lives in `footer.iconCredit` in `src/config/config.json`. The full notice is in `THIRD_PARTY_LICENSES.md`. The GitHub repo of the set has no license file, so check its terms before you publish.

**Trade-off.** The `linear` icons are thinner than the old filled ones, so the header buttons look lighter. To change the weight, import from `@solar-icons/react/bold` instead.

## Projects and insights come from GitHub

**What we chose.** The Projects list is read from the GitHub API at request time (`src/lib/github/projects.ts`), not typed into the config. `github.featured` in `src/config/config.json` lists the repos that must show, in order. Then the list is filled up to `github.limit` with your latest pushed public repos. `github.exclude` hides repos. `overrides` improves the text, link or picture of one repo.

**Why a `featured` list.** The first version took only the newest repos. Then helper repos (plugin lists, asset folders) pushed the real projects out. A short list that you control fixes this. The API still supplies the data, so stars, links and years stay right.

**Insights.** The old Insights section needed the author's own analytics product, so we removed it. Now it shows four numbers from GitHub: contributions and active days for the last 7 days (with a trend against the 7 days before), followers, and stars earned. Followers and stars work without a token. The contribution numbers need `PROFILE_G_TOKEN`.

**Cache.** Each GitHub call is cached for an hour (`next: { revalidate: 3600 }`). The contribution calendar keeps its own 15 minute cache.

**The command palette gets the project list as a prop.** The layout loads it once and passes it down to the header. The palette is a client component and cannot call the server code itself. Next.js shares one fetch for the same URL in a request, so the page and the layout do not call GitHub twice.

**Rejected.**
- Pinned repos: they need a token, and GitHub allows only six.
- Keeping a copy of the project list in the config: it would go out of date.
- A star count in the project rows: more noise on a one-line row.

**Trade-off.** A GitHub outage hides the Projects section for visitors, once the cache runs out.

## The Insights line chart

**What we chose.** The Insights section has a smooth two-line chart (`src/components/landing/insights-chart.tsx`, from the same MIT-licensed code). The two lines are contributions per day and pushes per day, for the last 7 days.

**Why these two lines.** The original plots visitors and views, which come from the author's own analytics product. We have no such data. GitHub gives us two real daily numbers: the contribution calendar, and the public push events.

**Why pushes and not commits.** GitHub no longer sends the list of commits in a push event, so we cannot count commits per day from the public API. A push event is still a real, public number. The trade-off is that pushes to private repos (such as work at Groww) show only in the contribution line.

**Needs a token.** The contribution calendar needs `PROFILE_G_TOKEN`. Without it the chart is hidden, like the contribution graph.

## Projects by topic, an automatic hover picture, and the articles carousel

**Projects use a GitHub topic.** A repo shows in Projects when it has the topic `portfolio` (set in `projects.github.topic`) and its owner is in `projects.github.owners`. Why: the earlier `featured` and `exclude` lists lived in the config, so every new project meant a code edit. A topic is set on GitHub in seconds and works for any repo, including repos in an organization. We use one search call (`searchReposByTopic`), cached for an hour. Rejected: a list in the config (needs a deploy), GitHub pinned repos (token needed, six at most), and a repo description tag (hacky to parse).

**The hover picture picks itself.** Order: your `image` override, then the share image of the live site, then the card GitHub generates for the repo. Why the share image: sites already publish a picture made for previews, so there is nothing to maintain. Why the GitHub card as a last step: every repo has one, so the hover never shows an empty box. Rejected: a screenshot service, because it adds a paid or rate-limited service and can show a loading placeholder. The hover image uses `unoptimized` because the pictures come from many hosts.

**Articles replace Testimonials.** The community carousel from that code is now the Recent articles carousel (`src/components/landing/articles.tsx`). We removed the testimonials code and config. Why: it was empty and it was the same component, so keeping both meant two copies of 200 lines. If you want testimonials later, the carousel can take another card type.

**Copy follows one voice.** The interface copy was rewritten with these rules: plain words, one word per idea (the place is "Blog", the items are "articles"), no exclamation marks in errors, a fix in every error, and no gendered words. Facts did not change.

## The logo and favicon are a sticker of my face

**What we chose.** The pixel "D" is gone. The header logo (`src/components/shared/logo.tsx`) is now the sticker image `public/images/logo.webp`. The favicon comes from the same picture: `src/app/favicon.ico` (16, 32 and 48 px), `src/app/icon.png` (512 px) and `src/app/apple-icon.png` (180 px). Next.js finds the `icon.png` and `apple-icon.png` files by name and adds the link tags itself.

**Why.** A picture of you is easier to recognize than a letter, and one source picture keeps the header and the browser tab the same.

**How the files were made.** The original image is 1275 by 1234 px with a clear background. Each file is the picture shrunk to fit a square, with the clear background kept. The `.ico` file holds three PNG images, which every current browser reads.

**Trade-off.** At 34 px the face is small and the hair is most of what you see. A tighter crop of the face would read better at that size, but the sticker outline would be lost.

## The About stickers are my own pictures

**What we chose.** The two small mascots above the greeting are now two stickers of mine, in `src/components/landing/about-mascots.tsx`. On the left, my head peeks over the greeting bar. On the right, a book, a coffee cup and a star sit on it. Both are plain images (`public/images/about-peek.webp` and `about-desk.webp`), cut from one shared picture. Each rises in with the same fade as the rest of the page. On hover, the head lifts and the pile tilts.

**Why.** The old mascots came with the original code and had a lot of code behind them (eight drawn characters and a click-to-swap game). Two images are simpler and are yours.

**Dark mode.** The pictures have thick black outlines, which vanish on a dark page. In dark mode they get a thin white edge from a CSS `drop-shadow`.

**Removed.** The mascot drawings, their CSS module and the `--mascot-*` colours.

## The header is a 3D landscape

**What we chose.** The dotted wave is gone. The header (`src/components/landing/hero-scenery.tsx`) now shows a 3D landscape of mountains, a green hill and a sunset sky, drawn with Three.js. The camera sways slowly, and the mouse moves it a little. It stops when the header is off screen, and it stays still when the system asks for reduced motion. The bottom edge fades out with a CSS mask.

**The model.** "landscape forest & mountains" by dasy444 on Sketchfab, CC BY 4.0, so commercial use is allowed with a credit. The footer shows "Landscape by dasy444 (CC BY 4.0)" with a link. The text lives in `footer.sceneryCredit` in `src/config/config.json`.

**How we got the file small.** The download was 26.8 MB unpacked. The shape data was only 18,600 triangles. The weight was in 14 large pictures, mostly normal maps. We shrank it once with the `gltf-transform` tool (run through `npx`, not added to the project): the trees and ground pictures at 256 px in WebP, shape data compressed with meshopt. The sky picture stays at its full 1024 by 512 px. The first version shrank the sky to 256 px too, and the sky looked blurry, because one small picture is stretched over the whole view. The result is `public/models/scenery.glb`, 560 KB. To redo this, run `npx @gltf-transform/cli resize scene.gltf r.gltf --width 256 --height 256 --pattern "Material.00*"`, then `npx @gltf-transform/cli optimize r.gltf scenery.glb --compress meshopt --texture-compress webp --texture-size 1024`. The pattern leaves out `Material.011`, which is the sky.

**Loading.** Three.js, the loader and the model load on their own after the page is ready, so the first view does not wait for them. They are about 520 KB for the model and about 170 KB (compressed) for Three.js.

**The camera sits inside the model's sky dome.** The model wraps the landscape in a sky sphere. A camera outside the sphere sees a ball, not a landscape.

**Rejected.** The Minecraft world model (CC BY 4.0). It has 492,000 triangles. Every block face has its own picture coordinates, so the shape cannot be simplified. The best result was 4.3 MB.

**Trade-off.** The header is now a real 3D scene, so it uses more graphics power than the old flat canvas, and it needs WebGL. If WebGL is missing, the header stays empty.

## The footer Earth is a 3D cartoon planet

**What we chose.** The dotted blue globe at the bottom is gone. The footer now shows "Earth cartoon" by onirix (CC BY 4.0): a bright low-poly planet with white clouds, green land, trees and a small plane that moves. It turns slowly and rises from the bottom edge under the quote. The footer shows the credit "Earth by onirix (CC BY 4.0)" with a link. The text lives in `footer.earthCredit` in `src/config/config.json`.

**One component for both 3D scenes.** The header landscape and the footer Earth both use `src/components/landing/model-canvas.tsx`. It loads Three.js and a model file after the page is ready, plays the animations that come inside the file, turns the model, swings the camera a little, follows the mouse, and stops when it is off screen or when motion is turned off. Each scene passes only its camera, scale and light settings. Why one component: the two scenes would otherwise carry about 150 lines of the same code each.

**The file.** The download was 5.5 MB unpacked. We shrank it once with `gltf-transform` (through `npx`, not added to the project): pictures at 256 px in WebP and compressed shape data, with simplification off, because simplifying breaks the animations. The result is `public/models/earth.glb`, 819 KB. To redo it: `npx @gltf-transform/cli optimize scene.gltf earth.glb --compress meshopt --simplify false --texture-compress webp --texture-size 256`.

**Removed.** The dotted globe (`footer-earth.tsx`), its land outline data file, and the orbiting satellite.

**Trade-off.** The Earth model is 819 KB, bigger than the 519 KB landscape. It loads only when the footer is about to appear on screen (the scene is created on scroll), so it does not slow the first view.

## Share pictures (Open Graph)

**What we chose.** Two pictures, 1200 by 630 px, in `public/og/`: `home.jpg` (the mountain landscape with my name and the line "I build apps and AI tools. Software engineer at Groww.") and `blog.jpg` (the cartoon Earth with the word "Blog"). The home picture is used for the home page and the structured data. The blog list uses the blog picture. A blog post uses its own cover image. The paths are in `site.ogImage` and `site.blogOgImage` in `src/config/config.json`, and the page tags read them in `src/app/layout.tsx` and `src/app/blog/page.tsx`.

**How they were made.** A temporary page drew the same 3D scenes at 1200 by 630 px. The browser then painted the scene and the text (in the site fonts) onto one canvas and sent it to a temporary route that saved a PNG. The PNGs were converted to JPEG at quality 88, which brought them from 1.3 MB to about 200 KB and 100 KB. The temporary page and route were deleted. They are not in the repo.

**Why this way.** The usual Next.js tool for share pictures cannot read our `.woff2` fonts and cannot draw a 3D scene. Pictures made from the real site match the real look.

**To change them.** Edit the text or the scene, take a new picture the same way, and replace the JPEG files. The picture is baked in, so it does not update by itself when `hero.greeting` changes in the config.

**Trade-off.** Social networks keep share pictures for a long time. After a deploy, use each network's debugger (for example the LinkedIn Post Inspector) to refresh the old picture.
