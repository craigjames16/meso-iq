export const MUSCLES = [
  'BACK',
  'BICEPS',
  'CALVES',
  'CHEST',
  'HAMSTRINGS',
  'QUADS',
  'SHOULDERS',
  'TRICEPS',
] as const;

export type MuscleKey = (typeof MUSCLES)[number];

export const muscleLabels: Record<MuscleKey, { label: string; short: string }> = {
  BACK: { label: 'Back', short: 'BCK' },
  BICEPS: { label: 'Biceps', short: 'BIC' },
  CALVES: { label: 'Calves', short: 'CLF' },
  CHEST: { label: 'Chest', short: 'CHT' },
  HAMSTRINGS: { label: 'Hamstrings', short: 'HAM' },
  QUADS: { label: 'Quads', short: 'QDS' },
  SHOULDERS: { label: 'Shoulders', short: 'SHO' },
  TRICEPS: { label: 'Triceps', short: 'TRI' },
};

export function isMuscle(value: string | null | undefined): value is MuscleKey {
  return value != null && (MUSCLES as readonly string[]).includes(value.toUpperCase());
}

export function toMuscle(value: string | null | undefined): MuscleKey | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return isMuscle(upper) ? (upper as MuscleKey) : undefined;
}

export function muscleLabel(value: string | null | undefined): string {
  const m = toMuscle(value);
  if (m) return muscleLabels[m].label;
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function muscleShort(value: string | null | undefined): string {
  const m = toMuscle(value);
  return m ? muscleLabels[m].short : (value ?? '').slice(0, 3).toUpperCase();
}
