# Dishant Sharma — Portfolio

My portfolio site, built with Next.js 16, React 19 and Tailwind CSS 4. The licenses of the open source parts are in `THIRD_PARTY_LICENSES.md`.

## Change the content

Every piece of content lives in one file: [`src/config/config.json`](src/config/config.json).

- `site`: title, description, share image, keywords.
- `person`: name, city, time zone, GitHub and dev.to usernames.
- `hero`: greeting, headline lines, description.
- `projects`: the list comes from the GitHub API. A repo shows when it has the GitHub topic named in `projects.github.topic` (`portfolio`) and belongs to one of `projects.github.owners`. Add the topic to a repo on GitHub and it shows here within an hour. `overrides` improves the text, link or picture of one repo.
- `experience`, `socials`, `skills`, `about`, `footer`: the page sections.
- `articles`: the recent dev.to articles in the carousel. `articles.limit` sets how many.
- `bookshelf`, `bookmarks`, `certifications`: empty at first. A section appears on the page as soon as its `items` list has an entry.
- `sections.order`: the order of the sections on the page.
- `navigation`: the tabs in the header.

The projects, the insights numbers (followers and stars) and the contribution graph all come from the GitHub API. The projects and the followers and stars work without a token. The contribution graph, and the contribution numbers in Insights, need the `PROFILE_G_TOKEN` environment variable.

## Run it

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and fill in what you need.

## Blog

Posts are written on dev.to and read back through its API. This site is the canonical home of each post, so run `pnpm devto:canonical` after you publish (use `--dry-run` first to see the changes). After publishing, call `/api/revalidate` with your `REVALIDATE_TOKEN` to rebuild the blog now. See `.env.example`.

## Deploy

`.github/workflows/prod-deploy.yaml` builds the `Dockerfile` and deploys it to Cloud Run.
