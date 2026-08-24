# WORLD.md

# Overview

**The world is a career universe of small, independent pixel-art worlds.**

Each world is one era. They are not buildings along a road, and there is no
single coastline connecting them: each has its own position on the map, its own
bounds, its own visual identity, its own camera framing and zoom, its own
environment and its own activities.

The journey follows Fatima's real career, but chronology is carried by the eras
and by the layout of the map — not by walking east.

```
overview  →  hover/zoom toward a world  →  it resolves into detail
          →  click  →  camera flies in, then arrives inside the world
          →  explore that world  →  click objects  →  portfolio content
```

The worlds:

| World | Era |
| --- | --- |
| Aptech | 2021–2023 |
| Freelance | 2022+ |
| Planet01 | 2023–2025 |
| Vaulsys | 2025–2026 |
| NatureTech | 2026– |
| BBIT | 2025+ |
| Workshop / Experiments | ongoing |
| Ideas | ongoing |

## Where this lives in the code

- `engine/universe/UniverseRegistry` — which worlds exist and where they sit.
  The counterpart of `SCENES`, one level up.
- `engine/universe/ChapterWorld` — what a world is, at runtime. One is alive at
  a time; entering builds it, leaving destroys it.
- `engine/chapters/*` — how each *kind* of world is built. One kind today.
- `engine/scene/SceneRegistry` — what is inside a world. Each scene names the
  chapter it belongs to.

## The coastline

The waterfront below is the composition the scenes are still authored against,
and it is still what a world's interior is built from — `layoutScenes` lifts a
chapter's own scenes off it and re-bases them onto that world's own origin. It
is a source of layout, not a place you walk end to end any more.

The player begins on the map, not at the dock.

The lighthouse is the fixed point the map is read against.

---

Dock

↓

Aptech Campus

↓

Freelance Cottage

↓

Planet01 Tower

↓

Vaultsys Vault

↓

NatureTech Foundry

↓

BBIT Spire

↓

Workshop

↓

Ideas Tent

↓

Lighthouse

---

# Background Layers

Sky

Clouds

Mountains (very subtle)

Ocean

Buildings

Road

Foreground vegetation

Particles

UI

---

# Permanent Elements

Ocean

Lighthouse

Clouds

Sun

Moon

Birds

Boats

Road

Grass

Trees

Benches

Street lamps

---

# Dynamic Elements

Cloud movement

Weather

Time

Water animation

NPC movement

Lighthouse beam

Smoke

Construction

Rain

Birds

Cats

Boats

---

# Navigation

Walk

Point and click

Keyboard

Camera drag

---

# Camera Rules

Camera follows player.

Can pan during dialogue.

Cannot leave world boundaries.

Zoom only for building interaction.

---

# World Mood

Quiet.

Peaceful.

Thoughtful.

Alive.

Never noisy.

Never chaotic.
