import { sessionTotals, type MuscleOf, type Session } from '../../analytics';
import { formatNumber, formatShortDay } from '../../utils/format';
import { workoutDisplayName } from '../../utils/names';

/** The workout's readable name. Default "<plan> - Day N" names fall back to the muscles trained. */
export function sessionName(session: Session, muscleOf?: MuscleOf, dayNumber?: number | null): string {
  const muscles = muscleOf ? session.sets.map((s) => muscleOf(s.exerciseId)) : [];
  return workoutDisplayName(session.workoutName, muscles, dayNumber);
}

/** "Day 2 · Pull" when the plan day is known, otherwise the workout name. */
export function sessionTitle(session: Session, dayNumber?: number | null, muscleOf?: MuscleOf): string {
  const name = sessionName(session, muscleOf, dayNumber);
  if (dayNumber == null || name === `Day ${dayNumber}`) return name;
  return `Day ${dayNumber} · ${name}`;
}

/** "Wed 16 · 14 sets · 8,760 lb" */
export function sessionMeta(session: Session): string {
  const t = sessionTotals(session);
  return `${formatShortDay(session.completedAt)} · ${t.hardSets} ${t.hardSets === 1 ? 'set' : 'sets'} · ${formatNumber(t.tonnage)} lb`;
}

/** Plan context line: "Meso 3 · Week 2 · Day 3", or "Off-plan". */
export function planContext(session: Pick<Session, 'planned' | 'mesocycleName' | 'iteration'>, dayNumber?: number | null): string {
  if (!session.planned) return 'Off-plan';
  return [session.mesocycleName, session.iteration != null && `Week ${session.iteration}`, dayNumber != null && `Day ${dayNumber}`]
    .filter(Boolean)
    .join(' · ');
}
