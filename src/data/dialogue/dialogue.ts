import type { DialogueData } from "@/types";
import waterfront from "./waterfront.json";

/**
 * All dialogue trees, keyed by dialogueId (Building.dialogueId → tree).
 * Content lives in JSON so copy is never hardcoded in components (DESIGN.md §UI).
 */
export const dialogue = waterfront as DialogueData;

export function getDialogue(id: string) {
  return dialogue[id];
}
