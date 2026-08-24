# DESIGN.md

# Project Name

The Waterfront

A handcrafted 2D pixel-art adventure portfolio that tells the story of Fatima's software engineering journey.

---

# Design Philosophy

This is NOT a portfolio website.

This is an interactive world where every visual element has meaning.

Every building represents a chapter.

Every weather effect represents status.

Every animation represents life.

Visitors should understand the journey before reading any text.

---

# Core Principles

• No modern SaaS UI.
• No glassmorphism.
• No neon cyberpunk.
• No generic terminal portfolio.
• No unnecessary complexity.

The world should feel handcrafted, warm and nostalgic.

---

# Art Style

Style:
Classic LucasArts-inspired point-and-click adventure.

Influences:
- Monkey Island
- Day of the Tentacle
- Eastward
- Dave the Diver
- Coffee Talk (lighting)

NOT:
- Pokemon
- Terraria
- Minecraft
- RPG Maker

---

# Pixel Scale

Character Height:
48-64px

Props:
32px

Buildings:
Hand-painted pixel scenes

Camera:
Side view (2.5D)

No top-down.

---

# Color Palette

Morning

Warm beige
Soft blue
Sea green
Sand
Muted wood

Day

Bright but desaturated.

Sunset

Main visual identity.

Orange
Peach
Pink
Purple

Night

Navy
Deep blue
Dark violet

Avoid pure black.

---

# Lighting Rules

Every light source matters.

Lantern
→ Warm orange

Moon
→ Soft blue

Forge
→ Bright orange

Computer
→ Cyan

Lighthouse
→ Cream white

Lightning
→ White

---

# Animation Philosophy

Everything moves.

Nothing bounces.

Motion should feel calm.

Examples

Smoke

Clouds

Leaves

Ocean

Flags

Birds

Water reflections

Lantern flicker

No exaggerated animations.

---

# UI Style

There are **two** visual contracts in this project and they must never be
blended. Which one applies is decided by *where a thing lives*, not by what it
says.

## World rules — everything drawn by PixiJS

Pixel art, without exception. Hand-plotted, nearest-neighbour, whole-number
scaling, whole-pixel positioning, no anti-aliasing, no CSS filters, no blur.

Text that exists *inside* the world — a building nameplate, the interaction
prompt floating over a landmark — is pixel text in Pixelify Sans, because it is
part of the picture.

Parchment surfaces, brass accents and pixel borders belong here, and here only.
Rounded corners stay forbidden in the world: a rounded corner cannot be drawn on
a pixel grid without either anti-aliasing it or lying about the radius.

## Interface rules — everything drawn by React

The interface is not part of the picture. It is the layer the picture is read
through, and it is a modern interface: dark translucent panels, rounded corners,
hairline borders, restrained shadows, generous spacing, clean modern type.
Framer Motion animates it; Tailwind styles it.

- **Never render interface through PixiJS.** A panel drawn into the canvas
  inherits the pixel grid and stops being readable at exactly the moment it has
  something important to say.
- **Never pixelate the interface.** No bitmap fonts for body copy, labels,
  metadata or navigation. A career history that has to be squinted at is a
  career history nobody reads.
- **Never let the interface take the screen.** The pixel universe is the hero.
  Panels are small, translucent and to one side; the world is never covered.

## Why this rule changed

The original — parchment, pixel borders, rounded corners forbidden, dialogue in
Pixelify Sans — was written for a single horizontal waterfront, where the UI was
a dialogue box inside an adventure game. It was right for that.

The project is now an interactive career universe: the pixel world carries the
feeling and a modern interface carries the actual portfolio. Pixelating that
interface would cost legibility in the one place legibility is the whole point.

Nothing is relaxed. The pixel rules still apply everywhere they ever applied —
they are simply now stated as applying to *the world*, which is the only place
they were ever about.

---

# Fonts

## In the world

Pixelify Sans, at whole-pixel sizes. Signs, nameplates, prompts.

## In the interface

Inter, or an equivalent clean sans-serif, at ordinary web sizes: titles, cards,
labels, metadata, navigation, and all body copy.

Pixelify Sans is **not** an interface font. It may appear there only as a
deliberate accent on a display title, never on anything that has to be read.

Never pure black. `--ink` is the darkest value in the system.

---

# Audio

Ambient only.

Ocean

Wind

Birds

Rain

Forge

Construction

Ship horn

No looping background music by default.

---

# Camera

Smooth panning.

No sudden jumps.

Slight cinematic easing.

## Zoom is navigation

Zoom is the primary way the universe is explored: pull back to see the career
whole, push in to discover a world, push further to enter it. Wheel, trackpad,
drag and click-to-focus all drive it.

The old rule read "zoom only during interactions", and it was right while the
world was one horizontal coastline where zoom could only ever frame a building.
In a universe of separate worlds, zoom is how the distance between them is
felt — forbidding it would leave the map with no way to be read at all.

What has *not* changed: every zoom is eased, never cut, and every zoom lands on
a whole number of screen pixels per art pixel. A camera that arrives at a
fractional scale resamples the art, and resampled pixel art is the one thing
this project does not ship.

The single exception to "no sudden jumps" is arriving inside a chapter world.
The map and a world's interior share no coordinate system, so that swap is a
cut. Easing between two unrelated spaces is a slide across nothing.

---

# Weather Language

Sunny

Completed

Fog

Old memories

Rain

Dormant

Storm

Major challenge

Lightning

Breakthrough

Construction Sparks

Current work

Confetti

Achievement

Dust

Abandoned experiment

---

# Performance Goals

60 FPS desktop

30+ FPS mobile

Load assets lazily

No loading longer than 3 seconds

---

# Golden Rule

Everything added to the world must answer:

"Why does this exist?"

If it has no meaning,

it doesn't belong.