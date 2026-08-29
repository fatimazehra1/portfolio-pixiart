# Screenshots

One folder per chapter, named by its `id` in `src/data/chapters.ts`
(`lighthouse` is the Contact chapter).

To add shots to a chapter:

1. Drop the image files into that chapter's folder here.
2. List the filenames in that chapter's `screenshots` array in
   `src/data/chapters.ts`, e.g.

   ```ts
   screenshots: ["dashboard.png", "invoice.png"],
   ```

Two to four per chapter reads best — the thumbnails are a two-column grid and
click to enlarge. An empty folder, an empty list, or a filename that does not
exist all degrade the same way: no gallery is rendered at all.
