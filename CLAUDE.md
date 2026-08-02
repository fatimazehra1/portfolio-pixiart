# CLAUDE.md

## Read this first

**Read `DESIGN.md`,`BUILDINGS.md`,`ART_DIRECTION.md`,`TIMELINE.md`,`WORLDs.md` before making any changes. Never introduce styles, interactions,
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
