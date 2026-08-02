# CLAUDE.md

## Read this first

Before making any code changes, always read:

- docs/DESIGN.md
- docs/ART_DIRECTION.md
- docs/WORLD.md
- docs/BUILDINGS.md
- docs/TIMELINE.md
- docs/TODO.md

These files are the project's single source of truth.

Never introduce styles, interactions,
or content that violate it.** DESIGN.md is the source of truth for art direction,
palette, camera, animation, weather meaning, audio, UI, and performance rules.
If a change genuinely requires breaking a rule, update DESIGN.md first and say why.

## Project

**The Waterfront** — an interactive pixel-art portfolio. A website first, game
second: PixiJS renders an ambient harbor; React renders all real content.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · PixiJS v8 (world) ·
Framer Motion (UI) · Howler.js (audio) · Zustand (state) · JSON (content) ·
Netlify · **pnpm**.

## Golden division of responsibility

- **PixiJS** owns everything *in the world*: sky, ocean, parallax, weather,
  lighthouse beam, boats, birds, character. Driven by `ticker.deltaTime`.
- **Framer Motion** owns everything *in the UI*: loading screen, dialogue,
  resume, contact, buttons, panels.
- **Never mix these.** No DOM animation of world objects; no Pixi-drawn UI.

## Conventions

- Import alias: `@/*` → `src/*`.
- Colors: reference CSS tokens in `globals.css` (`--ink`, `--parchment`,
  `--accent`, `--ocean`, `--sky-*`). Never hardcode hex in components. No pure black.
- Fonts: `.font-display` (Pixelify Sans) for titles/dialogue; `font-sans` (Inter)
  for body.
- Copy is content-driven: dialogue lives in `src/data/dialogue/*.json`, never
  hardcoded in components.
- Runtime-loaded assets (textures, audio) go in `public/assets/**` so they're
  served statically for PixiJS / Howler.
- Global state lives in `src/stores/worldStore.ts` (Zustand).

## Commands

```bash
pnpm dev      # start dev server (http://localhost:3000)
pnpm build    # production build
pnpm start    # serve the production build
pnpm lint     # eslint
```

## Layout

```
src/
  app/            # routes: / (world), /resume
  components/
    world/        # PixiCanvas, WorldStage (client boundary)
    ui/           # Hud, LoadingScreen
    dialogue/     # DialogueBox
    audio/        # audioManager (Howler singleton)
    camera/ weather/ npc/ buildings/ particles/   # to be built
  data/dialogue/  # JSON content
  stores/         # Zustand
  types/          # shared types (Weather, Building, DialogueTree, …)
  utils/
public/assets/    # sky, ocean, buildings, props, npc, boats, particles, weather, audio, fonts
```

## Art References

Always use images inside:

art/references/

as the visual source of truth.

Never invent a new art style.

Match:
- Pixel density
- Colors
- Lighting
- Atmosphere
- Building proportions
- Animation style

## Workflow

Build ONE feature at a time.

Never work on multiple systems simultaneously.

Complete the current task before starting another.

Do not refactor unrelated code.

Do not improve other systems unless explicitly asked.

## Pixel Art Rules

Everything must remain pixel-perfect.

No anti-aliasing.

No blurry scaling.

No CSS filters on pixel art.

Preserve crisp edges.

Animations should be subtle and atmospheric.

## Architecture

Each system must be isolated.

Examples:

camera/
weather/
ocean/
sky/
particles/
dialogue/
audio/
npc/

No giant files.

Keep everything reusable.

## Do Not Guess

If information is missing,

ask before implementing.

Never invent:

- Building layouts
- Career details
- Dialogue
- Art direction
- Features

Follow the documentation exactly.

## Git Workflow

Work in small feature branches.

Examples:

feature/sky
feature/ocean
feature/day-night
feature/weather
feature/aptech
feature/planet01

Complete one feature before starting another.

## Assets

Never generate placeholder assets unless requested.

If an asset is missing:

- Create the system first.
- Leave a clear TODO.
- Wait for the final asset before polishing.

Never mix different pixel art styles.

## Performance

Keep 60 FPS as the target.

Lazy load textures.

Destroy unused Pixi objects.

Reuse textures and particle systems.

Avoid unnecessary React re-renders.

Performance is a feature.