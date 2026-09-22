import type { Plan, PlanDay } from '../../types/plan';
import { workoutDisplayName } from '../../utils/names';

export function planDayName(day: PlanDay): string {
  if (day.isRestDay) return 'Rest';
  return workoutDisplayName(
    day.workout?.name,
    (day.workout?.workoutExercises ?? []).map((we) => we.exercise?.category),
    day.dayNumber,
  );
}

export function planCounts(plan: Pick<Plan, 'days'>): { training: number; rest: number; exercises: number } {
  const days = plan.days ?? [];
  const training = days.filter((d) => !d.isRestDay);
  return {
    training: training.length,
    rest: days.length - training.length,
    exercises: training.reduce((n, d) => n + (d.workout?.workoutExercises?.length ?? 0), 0),
  };
}

/** A program with no exercises in any day: an empty draft. */
export function isEmptyPlan(plan: Pick<Plan, 'days'>): boolean {
  return planCounts(plan).exercises === 0;
}

export function sortedDays(plan: Pick<Plan, 'days'>): PlanDay[] {
  return [...(plan.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);
}
