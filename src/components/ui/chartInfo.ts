/**
 * What each chart measures, in the reader's terms and then in the formula's.
 * Keep every claim traceable to a function in `src/analytics`.
 */
export interface ChartInfo {
  /** Sheet title. Matches the card title the info button sits on. */
  title: string;
  /** One line: what the marks on the chart are. */
  summary: string;
  /** Definition bullets: term, then how it's computed. */
  details: { term: string; text: string }[];
  /** A caveat worth reading before acting on the chart. */
  note?: string;
}

export type ChartInfoId =
  | 'consistency'
  | 'tonnage'
  | 'hardSets'
  | 'strengthTrend'
  | 'cycleRadar'
  | 'e1rm'
  | 'sessionVolume'
  | 'weightRepMatrix'
  | 'repRanges'
  | 'overload'
  | 'volumeProfile';

export const CHART_INFO: Record<ChartInfoId, ChartInfo> = {
  consistency: {
    title: 'Consistency',
    summary: 'One cell per calendar day, shaded by how many working sets you logged that day.',
    details: [
      { term: 'Working set', text: 'A set of at least 1 rep in a finished session. Drop, rest-pause and myo-rep sets attached to it are not counted again.' },
      { term: 'Shade', text: 'Rest for no sets, then 1–9, 10–17, and 18 or more working sets.' },
      { term: 'Streak', text: 'Consecutive weeks, Monday to Sunday, with at least one finished session. The current week counts once you train in it and does not break the streak before then.' },
      { term: 'Planned days hit', text: 'Finished training days divided by the days that were due: every non-rest day in past weeks, and in the current week the days up to the last one you completed.' },
    ],
    note: 'Off-plan sessions shade a day and keep a streak alive, but they are not planned days, so they do not raise the adherence figure.',
  },
  tonnage: {
    title: 'Volume per month',
    summary: 'Each bar is the total weight you moved in that month, in pounds.',
    details: [
      { term: 'Volume', text: 'Weight × reps, summed over every set you logged in the month, including drop, rest-pause and myo-rep sets.' },
      { term: 'Dashed line', text: 'The mean volume of that month and the two before it. It is blank for the first two months of data, which have no three-month window.' },
      { term: 'Faded bar', text: 'The current month, still in progress. It is excluded from the three-month average until it closes.' },
    ],
    note: 'Volume rises with body-weight-independent load and rep count, so it compares a month against your other months. It does not compare one muscle against another — use working sets for that.',
  },
  hardSets: {
    title: 'Working sets this week',
    summary: 'Each bar is the number of working sets you have logged for that muscle since Monday.',
    details: [
      { term: 'Working set', text: 'A set of at least 1 rep. Sets attached to it are part of it, not extra sets.' },
      { term: 'Muscle', text: 'A set counts toward the muscle category of its exercise. Exercises with no category are left out.' },
      { term: 'Tick', text: 'Your average for that muscle over the previous four weeks, not including this one. Weeks you did not train count as zero.' },
    ],
    note: 'Set counts, not volume, so a set of calf raises and a set of squats weigh the same here. That is what makes the muscles comparable.',
  },
  strengthTrend: {
    title: 'Strength trend',
    summary: 'One row per exercise in this cycle: its latest estimated 1RM, the change since the cycle started, and a sparkline of every session.',
    details: [
      { term: 'Estimated 1RM', text: 'The Epley estimate from the best set of the session: weight × (1 + reps ÷ 30), or the weight itself for a single. Only working sets with weight above zero and 1 to 15 reps qualify.' },
      { term: 'Change', text: 'The latest estimate against the first one in this cycle, as a percentage.' },
      { term: 'Sparkline', text: 'One point per session, oldest first, scaled to that exercise’s own range. The line shows shape, not size, so heights are not comparable between rows.' },
      { term: 'Stall warning', text: 'At least four sessions, and the best estimate in the last three is no more than 0.5% above the best before them.' },
    ],
  },
  cycleRadar: {
    title: 'This cycle vs. last',
    summary: 'One spoke per muscle, comparing the same week of this cycle and the previous one.',
    details: [
      { term: 'Value', text: 'Working sets for that muscle in the current week of this cycle, against the same week number of the previous cycle. If the previous cycle was shorter, its last week is used.' },
      { term: 'Spokes', text: 'The six muscles with the most sets across both cycles.' },
      { term: 'Scale', text: 'Both shapes are normalised to the single largest value across both cycles, so the distance from the centre is relative. Read the shape, not the set count.' },
    ],
    note: 'The current week is usually still in progress, so this shape grows until the week closes.',
  },
  e1rm: {
    title: 'Estimated 1RM',
    summary: 'One point per session: what your best set that day predicts you could lift once.',
    details: [
      { term: 'Estimate', text: 'The Epley formula, weight × (1 + reps ÷ 30), applied to the session’s best set. A single rep returns the weight itself.' },
      { term: 'Best set', text: 'The working set with the highest estimate. Only sets with weight above zero and 1 to 15 reps qualify, because the formula drifts past 15 reps.' },
      { term: 'Dashed line', text: 'A least-squares straight line fitted through the points in view. Its slope is the overload rate for this exercise.' },
      { term: 'Ringed point', text: 'A personal record: an estimate higher than every earlier session. The first session is the baseline and is never a record.' },
    ],
    note: 'This is a prediction from submaximal work, not a tested max. Treat the direction as the signal and the number as an approximation.',
  },
  sessionVolume: {
    title: 'Session volume',
    summary: 'One point per session: the total weight moved on this exercise that day.',
    details: [
      { term: 'Volume', text: 'Weight × reps, summed over every set of this exercise in the session, including sets attached to a working set.' },
    ],
    note: 'Volume moves with set count as much as with load, so a lighter, higher-rep day can outscore a heavy one.',
  },
  weightRepMatrix: {
    title: 'Where you actually train',
    summary: 'A grid of the weights you use against the rep counts you hit, shaded by how often each pairing happens.',
    details: [
      { term: 'Rows', text: 'The distinct weights of your working sets on this exercise, heaviest first. Above six weights, the six most frequent are kept.' },
      { term: 'Columns', text: 'Rep buckets, from 4 or fewer up to 13 and above.' },
      { term: 'Shade', text: 'Sets in that cell. Non-empty cells are split into four levels by quartile, so the most frequent pairing is always the darkest one.' },
    ],
    note: 'Shading is relative to this exercise only. A dark cell means "often for you", not a set count you can compare with another exercise.',
  },
  repRanges: {
    title: 'Rep ranges',
    summary: 'The share of your working sets that landed in each rep bucket over the selected period.',
    details: [
      { term: 'Share', text: 'Working sets in the bucket divided by all working sets in the period. The five bars sum to 100%.' },
      { term: 'Scope', text: 'Every exercise you logged in the period, not just the exercise selected above.' },
    ],
  },
  overload: {
    title: 'Overload rate by muscle',
    summary: 'How fast the estimated 1RM of each muscle’s exercises is rising, as a percentage per week.',
    details: [
      { term: 'Per exercise', text: 'A least-squares line is fitted through the estimated 1RM points in the period, against weeks elapsed. The rate is that slope divided by the mean estimate, so it reads as a percentage rather than pounds.' },
      { term: 'Per muscle', text: 'The average of that muscle’s exercises, weighted by how many sessions each contributed.' },
      { term: 'Not enough sessions', text: 'An exercise needs at least three sessions in the period to be fitted, and a muscle needs at least one qualifying exercise.' },
    ],
    note: 'A straight-line fit smooths over deloads and missed weeks. Over a short period a single heavy or light session can swing the rate.',
  },
  volumeProfile: {
    title: 'Starting sets per muscle',
    summary: 'The working sets each muscle is scheduled for in week 1 of this program.',
    details: [
      { term: 'Value', text: 'The starting sets of every exercise for that muscle, summed across all training days in the week. Exercises with no target use 2 sets.' },
      { term: 'Gold bar', text: 'A muscle the program trains with fewer than 4 sets a week. Most muscles need 8 or more to grow.' },
    ],
    note: 'This is the plan, not what you logged. Sets you add or skip while training do not change it.',
  },
};
