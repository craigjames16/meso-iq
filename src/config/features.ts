// Feature flags for redesign items that wait on API changes. Each flag stays
// false until its backend change ships. See docs/redesign/04-backend.md.
export const features = {
  /** Rest-pause option in the set menu. Needs REST_PAUSE in the set type enum. */
  REST_PAUSE_SETS: false,
  /** Editable day names in the program builder. Needs per-day `name` in plan create and update. */
  DAY_NAMES: false,
  /** Rep ranges and starting sets. Needs repMin, repMax and startingSets on workout exercises. */
  PROGRAM_TARGETS: false,
  /** Start date row in the Start a cycle sheet. Needs `startDate` on POST /api/mesocycles. */
  CYCLE_START_OPTIONS: false,
  /** "Clean up" for empty drafts. Needs DELETE /api/plans/:id. */
  PLAN_DELETE: false,
} as const;

export type FeatureFlag = keyof typeof features;

export function isEnabled(flag: FeatureFlag): boolean {
  return features[flag];
}
