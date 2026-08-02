/**
 * Join class names conditionally. Tiny helper so we don't pull in a dependency
 * for a one-liner. Falsy values are dropped.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
