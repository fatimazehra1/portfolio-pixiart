# The Waterfront

An interactive pixel-art portfolio — a harbor you explore, where every building is
a chapter of Fatima's software-engineering journey. A **website first, game second**:
PixiJS renders the living world, React renders all real content (resume, dialogue).

See **[DESIGN.md](./DESIGN.md)** for the art & interaction bible, and
**[CLAUDE.md](./CLAUDE.md)** for the engineering conventions.

## Stack

| Purpose            | Technology            |
| ------------------ | --------------------- |
| Framework          | Next.js (App Router)  |
| Language           | TypeScript            |
| Styling            | Tailwind CSS v4       |
| World rendering    | PixiJS v8             |
| UI animation       | Framer Motion         |
| Audio              | Howler.js             |
| State              | Zustand               |
| Content            | JSON (dialogue)       |
| Deployment         | Netlify               |
| Package manager    | pnpm                  |

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Other scripts: `pnpm build`, `pnpm start`, `pnpm lint`.

> pnpm approves native build scripts (`sharp`, `unrs-resolver`) via
> `pnpm-workspace.yaml → allowBuilds`. If a fresh install skips them, run
> `pnpm approve-builds`.

## Structure

- `src/app` — routes (`/` interactive world, `/resume` fast SEO-friendly resume)
- `src/components/world` — PixiJS canvas + client boundary
- `src/components/{ui,dialogue,audio}` — React UI, Framer Motion, Howler
- `src/stores/worldStore.ts` — global Zustand state
- `src/data/dialogue/*.json` — dialogue content (never hardcode copy)
- `public/assets/**` — runtime-loaded textures & audio

## Deploy

Push to GitHub and connect the repo on Netlify. `netlify.toml` sets the pnpm build
command and the Next.js runtime plugin. No backend required for v1.
