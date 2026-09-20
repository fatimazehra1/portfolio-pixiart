

# The Waterfront

**An interactive pixel-art portfolio. Explore a harbor where every building is a chapter of my software engineering journey.**


## Overview

The Waterfront is a portfolio built as a small explorable world. You walk a harbor, step into buildings, and talk to the people inside. Each building tells one part of my story as a developer.

The guiding rule is **website first, game second**. The world is fun to explore, but nothing important is locked behind it. Anyone who wants the short version can skip straight to a fast, SEO-friendly resume page.

## Highlights

- **Living pixel-art world** rendered with PixiJS v8
- **Real content in real HTML.** All text, dialogue and resume content is rendered by React, so it stays accessible and crawlable
- **Dialogue system** driven by JSON, with Framer Motion transitions
- **Ambient audio** powered by Howler.js
- **`/resume` route** for recruiters and anyone in a hurry
- **Zero backend.** Static-friendly and deployable in minutes

## How it works

The project splits responsibilities cleanly between two layers:

| Layer | Owns | Tools |
| ----- | ---- | ----- |
| **World** | Map, characters, camera, movement, ambient animation | PixiJS |
| **UI** | Dialogue, resume content, overlays, navigation | React, Framer Motion, Tailwind |

A single Zustand store (`src/stores/worldStore.ts`) sits between them. The canvas writes world events into it (for example, "player entered a building"), and React reads from it to open the matching dialogue or panel.

## Tech stack

| Purpose         | Technology           |
| --------------- | -------------------- |
| Framework       | Next.js (App Router) |
| Language        | TypeScript           |
| Styling         | Tailwind CSS v4      |
| World rendering | PixiJS v8            |
| UI animation    | Framer Motion        |
| Audio           | Howler.js            |
| State           | Zustand              |
| Content         | JSON (dialogue)      |
| Deployment      | Netlify              |
| Package manager | pnpm                 |

## Getting started

**Prerequisites:** Node.js 20 or newer and [pnpm](https://pnpm.io/installation).

```bash
# install dependencies
pnpm install

# start the dev server
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command       | What it does                     |
| ------------- | -------------------------------- |
| `pnpm dev`    | Start the development server     |
| `pnpm build`  | Create a production build        |
| `pnpm start`  | Serve the production build       |
| `pnpm lint`   | Run ESLint                       |

> **Note:** pnpm approves native build scripts (`sharp`, `unrs-resolver`) through
> `pnpm-workspace.yaml` under `allowBuilds`. If a fresh install skips them, run
> `pnpm approve-builds`.

## Project structure

```text
.
├── src
│   ├── app                    # Routes: / (interactive world), /resume (fast resume)
│   ├── components
│   │   ├── world              # PixiJS canvas and client boundary
│   │   ├── ui                 # React UI and Framer Motion components
│   │   ├── dialogue           # Dialogue rendering
│   │   └── audio              # Howler.js audio layer
│   ├── stores
│   │   └── worldStore.ts      # Global Zustand state
│   └── data
│       └── dialogue           # Dialogue content as JSON
├── public
│   └── assets                 # Runtime-loaded textures and audio
├── DESIGN.md                  # Art and interaction guide
└── netlify.toml               # Netlify build config
```

## Editing content

All copy lives in `src/data/dialogue/*.json`. Components never hardcode text, so updating a conversation or adding a new one is a data change, not a code change.

## Design

See [DESIGN.md](./DESIGN.md) for the art direction and interaction rules behind the world.

## Deployment

The site deploys to Netlify.

1. Push the repo to GitHub.
2. Import it on [Netlify](https://app.netlify.com/start).
3. Deploy. `netlify.toml` already sets the pnpm build command and the Next.js runtime plugin.

No environment variables or backend are required for v1.

## Author

Built by **Fatima Zehra Shakeel**, a full-stack developer working with Laravel and the modern JavaScript ecosystem.
