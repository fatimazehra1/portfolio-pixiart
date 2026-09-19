import type { Panel } from "../contentBlocks";
import { aptechPanel } from "./aptech";
import { freelancePanel } from "./freelance";
import { planet01Panel } from "./planet01";
import { vaultsysPanel } from "./vaultsys";
import { bbitPanel } from "./bbit";
import { naturetechPanel } from "./naturetech";
import { ideasPanel } from "./ideas";
import { workshopPanel } from "./workshop";

/**
 * Every island's panel, in the order the career is read in the timeline view.
 *
 * Chronological, with the Workshop last: it has no start that means anything,
 * it ran alongside all of the others.
 */
export const PANELS: readonly Panel[] = [
  aptechPanel,
  freelancePanel,
  planet01Panel,
  vaultsysPanel,
  bbitPanel,
  naturetechPanel,
  ideasPanel,
  workshopPanel,
];

const BY_ID = new Map(PANELS.map((panel) => [panel.id, panel]));

/** One island's panel. Undefined for a chapter still on the legacy plaque. */
export function panelFor(id: string): Panel | undefined {
  return BY_ID.get(id);
}
