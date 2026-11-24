# Dishant Sharma portfolio

This is the source code of https://dishantsharma.dev. It is the personal site of Dishant Sharma, a software engineer.

The site shows projects, work history, articles, GitHub activity and links. A 3D landscape fills the header. A 3D Earth fills the footer.

All content comes from one file: `src/config/config.json`. Projects, insights and the contribution graph come from the GitHub API. Articles come from dev.to.

## Contents

- What the site has
- Tech stack
- Quick start
- Environment variables
- Change the content
- Where the data comes from
- The 3D header and footer
- Share pictures
- The blog
- Project structure
- Scripts
- Deploy
- Search engine setup
- Troubleshooting
- Credits and licenses
- More documents

## What the site has

The home page has these parts, in this order:

- A header with a 3D landscape, the logo, the Home and Blog tabs, and four icon buttons.
- A greeting with the name, the city and a short intro.
- Projects. Each row links to the live site or to the code.
- Experience, with the jobs and dates.
- Recent articles, in two rows that scroll in opposite directions.
- Socials, Stack and About.
- Insights, with four GitHub numbers and a line chart.
- The GitHub contribution graph.
- A footer with a quote, the credits and a 3D Earth.

The four icon buttons are the command palette, the GitHub link, the sitemap link and the theme toggle.

The command palette opens with `Ctrl + K` or `Cmd + K`. The theme toggle also answers to the `D` key.

The site also has a blog at `/blog`, one page for each article, a 404 page with a small animated scene, a sitemap and a `robots.txt` file.

A section appears only when it has content. An empty list in the config hides its section.

## Tech stack

- Next.js 16 with the App Router, React 19 and TypeScript.
- Tailwind CSS 4 for styles.
- Three.js for the 3D scenes.
- `motion` for animation, `cmdk` for the command palette and `radix-ui` for tooltips and popovers.
- `next-themes` for the light and dark theme.
- Solar icons (`@solar-icons/react`), plus `trazo-stickers` and `stick-it-up` for stickers.
- The GitHub REST and GraphQL APIs for projects, insights and the graph.
- The dev.to API for articles.
- Docker, GitHub Actions and Google Cloud Run for deployment.
- The React Compiler is on. It is set in `next.config.ts`.

The fonts are DM Sans, Instrument Serif, Geist Mono and Caveat. The font files are in `src/app/fonts/`. The build never needs to fetch a font from Google.

## Quick start

You need Node.js 20 or newer and `pnpm`.

1. Install the packages:

```bash
pnpm install
```

2. Copy the example environment file:

```bash
cp .env.example .env.local
```

3. Put your values in `.env.local`. The next section explains each value.

4. Start the development server:

```bash
pnpm dev
```

5. Open http://localhost:3000.

The site works with an empty `.env.local`. Without a GitHub token, the contribution graph and some Insights numbers do not show.

If you change `.env.local`, stop the server and start it again. The server reads this file only at start.

## Environment variables

All variables are optional for local work.

- `NEXT_PUBLIC_SITE_URL`. The public address of the site, with no slash at the end. It sets canonical links, the sitemap and share tags. The default is `site.url` in `config.json`.
- `PROFILE_G_TOKEN`. A GitHub token. It raises the rate limit for projects and followers. It is required for the contribution graph, the contribution numbers in Insights and the line chart.
- `DEVTO_USERNAME`. The dev.to account that holds the articles. The default is `person.devtoUsername` in `config.json`.
- `DEVTO_API_KEY`. A dev.to key. Reading works without it. Writing canonical links needs a key with write access.
- `REVALIDATE_TOKEN`. A secret for the refresh endpoint. If it is not set, the endpoint always answers 401.

Never add `NEXT_PUBLIC_` to the name of a secret. That prefix puts the value into the browser code.

For `PROFILE_G_TOKEN`, use a fine-grained token with read-only access to public repositories. Do not use a token with wide permissions.

To make a random value for `REVALIDATE_TOKEN`, use this command:

```bash
openssl rand -hex 32
```

## Change the content

Open `src/config/config.json`. Change a value and reload the page. No code change is needed.

These are the top-level keys:

- `site`. The page title, description, keywords, share pictures and the job title for search engines.
- `person`. The name, the city, the time zone and the GitHub and dev.to user names.
- `hero`. The greeting, the headline lines, the intro text and the word in the intro that is underlined.
- `navigation`. The tabs in the header.
- `sections`. The order of the sections and the short notes beside them.
- `projects`. The GitHub topic that selects projects, and text overrides for single projects.
- `experience`. Jobs with a role, a company, dates, a place and an optional summary.
- `articles`. The title of the carousel and how many articles it shows.
- `socials`. The links, each with a name, a handle, an address and an icon.
- `skills`. The categories and the skills in each category.
- `about`. The greetings for morning, afternoon and evening, and the three About lines.
- `footer`. The quote, the credit lines and the model credits.
- `insights`, `github`. Switches for these sections.
- `bookshelf`, `bookmarks`, `certifications`. Empty lists. Add items and the sections appear.
- `notFound`. The text of the 404 page.

Interface text such as tooltips and screen reader labels stays in the files of `src/config/`. It is not personal data.

### Add or hide a project

Projects come from GitHub, not from the config.

1. Open the repository on GitHub.
2. Click the gear next to About.
3. Add the topic `portfolio`.
4. Wait up to one hour. The project then shows on the site.

To hide a project, remove the topic.

The topic name and the owners are in `projects.github` in `config.json`. The owners can be users or organizations.

To improve one project, add an entry to `projects.overrides`. Use the repository name as the key. You can set `title`, `tagline`, `description`, `liveUrl`, `image`, `imageAlt` and `category`.

### Add a skill

Add an item to `skills.items` with a name, a category id and an icon name. The icon names are in `skillIconMap` in `src/components/landing/skills.tsx`. For a new technology, add its icon there.

### Change the order of the sections

Edit `sections.order`. Use only the ids that the type `SectionId` allows. They are in `src/config/types.ts`.

## Where the data comes from

All GitHub and dev.to results are cached for one hour. A new topic, a new star or a new article can take up to one hour to show.

- Projects. One search call for repositories with the topic. The code is `src/lib/github/projects.ts`.
- Hover picture of a project. The picture comes from the first of these that exists. The `image` in the overrides. Then the share image of the live site. Then the card that GitHub makes for the repository.

- Insights. Followers and stars come from the REST API. Contributions and active days for the last 7 days come from the contribution calendar. The code is `src/lib/github/insights.ts`.
- Chart. Two lines for the last 7 days. One line shows contributions. The other shows pushes from the public event list. Pushes to private repositories show only in contributions.

- Contribution graph. The GraphQL API, with a cache of 15 minutes. It needs `PROFILE_G_TOKEN`.
- Articles. The dev.to API. The code is `src/lib/api/devto.ts`.

If GitHub cannot be reached, the affected section hides. The rest of the page still loads.

The home page is built on every request, because it reads the token at that time. A static page would never show the GitHub parts, because the Docker build has no secrets.

## The 3D header and footer

Both scenes use one component, `src/components/landing/model-canvas.tsx`. It does these things:

- It loads Three.js and the model after the page is ready, so the first view does not wait.
- It plays the animations that are inside the model file.
- It swings the camera a little and follows the mouse.
- It stops when the scene is off screen or the tab is hidden.
- It stays still when the system setting for reduced motion is on.

The header uses `public/models/scenery.glb` (560 KB). The footer uses `public/models/earth.glb` (819 KB). The camera settings are in `src/components/landing/profile-banner.tsx` and `src/components/landing/footer-scene.tsx`.

If the browser has no WebGL, the scene stays empty. The rest of the page is not affected.

### Make a model smaller

The original models are large. They were shrunk once with the `gltf-transform` tool. The tool is not a dependency of the project. Use `npx` to run it.

For the landscape, shrink all pictures except the sky, which is `Material.011`:

```bash
npx @gltf-transform/cli resize scene.gltf r.gltf --width 256 --height 256 --pattern "Material.00*"
npx @gltf-transform/cli optimize r.gltf scenery.glb --compress meshopt --texture-compress webp --texture-size 1024
```

For the Earth, turn off simplification. Simplification breaks the animations:

```bash
npx @gltf-transform/cli optimize scene.gltf earth.glb --compress meshopt --simplify false --texture-compress webp --texture-size 256
```

Put the result in `public/models/`. If the sky looks blurry, the sky picture is too small.

### Add the credit when you change a model

Both models use the CC BY 4.0 license. The license requires a credit. The credit text is in `footer.sceneryCredit` and `footer.earthCredit` in `config.json`. Keep it when you keep the model.

## Share pictures

The pictures shown when someone shares a link are in `public/og/`. Each one is 1200 by 630 pixels.

- `home.jpg` is used for the home page.
- `blog.jpg` is used for the blog list.
- A blog article uses its own cover image from dev.to.

The paths are in `site.ogImage` and `site.blogOgImage` in `config.json`.

To make a new picture, draw the scene at 1200 by 630 pixels in a temporary page. Paint the scene and the text onto one canvas. Save the canvas as a JPEG at quality 88. Replace the file. The pictures do not change by themselves when you edit the config.

Social networks keep old pictures for a long time. After a deploy, use the debug tool of each network to refresh the picture.

## The blog

Articles are written on dev.to. The site reads them through the dev.to API and shows them at `/blog`.

This site is the canonical home of each article. Every article on dev.to must name `https://dishantsharma.dev/blog/<slug>` as its canonical address. Otherwise search engines treat the dev.to copy as the original.

After you publish an article, call the refresh endpoint. It marks the blog pages and the sitemap as stale. It also sets the canonical address of every article on dev.to.

```bash
curl -X POST -d '' -A revalidate-script https://dishantsharma.dev/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_TOKEN"
```

Keep the empty `-d ''`. Cloud Run answers 411 to a POST with no body. Keep the `-A` option. Plain `curl` can be reset by the front end.

Load the token first. An empty token makes the call fail with a reset connection.

```bash
export REVALIDATE_TOKEN=$(grep '^REVALIDATE_TOKEN=' .env.local | cut -d= -f2-)
```

To set canonical addresses from your computer, use the script. Use `--dry-run` first to see the changes. The key needs write access.

```bash
DEVTO_API_KEY=xxx pnpm devto:canonical -- --dry-run
DEVTO_API_KEY=xxx pnpm devto:canonical
```

The script exits with an error code if one update fails.

## Project structure

```text
src/
  app/                 Pages, layout, fonts, sitemap, robots and the refresh route
    blog/              The blog list and the article page
    api/revalidate/    The refresh endpoint
    fonts/             Self-hosted font files
  components/
    landing/           The sections of the home page and the 3D canvas
    blog/              The blog list and article components
    shared/            The header, the logo, icons and the command palette
    ui/                Small parts such as the tooltip and the dialog
  config/              config.json and the files that read it
  icons/               Logos of technologies
  lib/
    github/            Projects, insights and the contribution graph
    api/devto.ts       The dev.to client and its cache
    seo.ts             Structured data for search engines
public/
  models/              The two 3D model files
  og/                  The share pictures
  images/              Sticker pictures
docs/
  design.md            Why each decision was made
  flow.md              How data and users move through the site
scripts/               The canonical address script
```

## Scripts

- `pnpm dev`. Starts the development server on port 3000.
- `pnpm build`. Makes the production build.
- `pnpm start`. Starts the production server. Use it after `pnpm build`.
- `pnpm lint`. Examines the code with ESLint.
- `pnpm devto:canonical`. Sets the canonical address of every dev.to article.

The build makes a static page for every article. It is slow, about three minutes, because dev.to limits the number of requests. `next.config.ts` sets `cpus: 1` for this reason.

## Deploy

The site runs on Google Cloud Run. The `Dockerfile` builds the image. The workflow `.github/workflows/prod-deploy.yaml` builds, pushes and deploys it.

The workflow starts by hand. It does not start on a push.

```bash
gh workflow run prod-deploy.yaml --repo dishant0406/dishant-portfolio --ref main
```

To follow the run:

```bash
gh run list --repo dishant0406/dishant-portfolio --limit 1
```

The workflow needs these GitHub Actions secrets:

- `GCP_PROJECT_ID`, `GCP_REGION`, `GAR_LOCATION`, `GAR_REPOSITORY` and `CLOUD_RUN_SERVICE`.
- `GCP_WORKLOAD_IDENTITY_PROVIDER` and `GCP_DEPLOY_SERVICE_ACCOUNT`.
- `NEXT_PUBLIC_SITE_URL`.
- `DEVTO_API_KEY`.

It needs one repository variable: `DEVTO_USERNAME`.

Two secrets live in Google Secret Manager and are already set on the Cloud Run service: `REVALIDATE_TOKEN` and `PROFILE_G_TOKEN`. The workflow updates `REVALIDATE_TOKEN`. It does not set `PROFILE_G_TOKEN` again, because Cloud Run refuses to change a secret value to a plain value.

Never pass a secret as a Docker build argument. Build arguments stay in the image history.

The cache lives inside one server instance. The service uses one instance at most, so a refresh reaches every visitor. If you raise the maximum number of instances, the refresh reaches only one instance.

### After you deploy

Make sure that these addresses answer 200:

- `/`, `/blog` and `/sitemap.xml`.
- `/models/scenery.glb`, `/models/earth.glb`, `/og/home.jpg` and `/og/blog.jpg`.

Then open the home page and make sure that the header scene, the Insights chart and the graph show.

## Search engine setup

- Each page has a canonical address, a title and a description.
- The home page has structured data for a person and a website. Each article has structured data for a blog post and a breadcrumb.
- `src/app/sitemap.ts` lists the home page, the blog and every article. It refreshes every hour.
- `src/app/robots.ts` allows all pages except `/api/`.
- Every page links to the sitemap with a `<link rel="sitemap">` tag.
- `www.dishantsharma.dev` redirects to the main address. The rule is in `next.config.ts`.

## Troubleshooting

### The Projects section is empty

No repository has the topic `portfolio`, or GitHub cannot be reached. Add the topic. A new result can take up to one hour. Restart the development server to clear its memory cache.

### The contribution graph is missing

`PROFILE_G_TOKEN` is not set, or the token is wrong. Set it and restart the server.

### The production build fails on Linux with "Can't resolve" for a local file

The letter case of a file name does not match the import. macOS ignores letter case, but Linux does not. Rename the file and make sure that git tracks the new name.

### The development server shows old styles

Touch `src/app/globals.css` or restart the server.

### The header scene is empty

The browser has no WebGL, or the model file did not load. Open the browser console and look for an error.

### The sky in the header is blurry

The sky picture in the model is too small. Make the model again and keep the sky at 1024 pixels.

### A new article does not show

Call the refresh endpoint. If it still does not show, dev.to is serving a cached list. Wait a few minutes.

## Credits and licenses

The full notices are in `THIRD_PARTY_LICENSES.md`. The footer of the site shows the credits that a license requires.

- Header landscape: "landscape forest & mountains" by dasy444, CC BY 4.0.
- Footer Earth: "Earth cartoon" by onirix, CC BY 4.0.
- Icons: the Solar icon set by 480 Design, CC BY 4.0.
- Stickers: the `trazo-stickers` and `stick-it-up` packages, MIT.
- Parts of the interface code are used under the MIT license. The notice is in `THIRD_PARTY_LICENSES.md`.

The rest of this project is private and belongs to Dishant Sharma.

## More documents

- `docs/design.md` explains each design decision, what was rejected and the trade-offs.
- `docs/flow.md` explains each flow step by step, with the edge cases and what the visitor sees.
