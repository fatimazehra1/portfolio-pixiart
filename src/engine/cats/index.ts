/**
 * The cats — a light easter egg over the top of the portfolio.
 *
 * Fully ignorable by design: nothing here blocks a click that meant something
 * else, and deleting the folder leaves the site unchanged. Import from
 * "@/engine/cats".
 */
export { CatLayer } from "./CatLayer";
export type { CatAnchorBox, CatLayerOptions } from "./CatLayer";
export { CATS, SECRET_CAT, ALL_CAT_IDS, catName, catsForChapter } from "./CatRoster";
export type { CatSpec, CatAnchor, CatDepth } from "./CatRoster";
export { CAT_WIDTH, CAT_HEIGHT } from "./CatFactory";
