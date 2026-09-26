// Motion tokens. Springs are described here the way Apple's designers describe
// them — a response and a damping ratio — and converted to the mass, stiffness
// and damping triplet that `Animated.spring` takes.
//
// - **Response**: how long the value takes to reach its target, in seconds.
//   Lower is snappier. A spring has no fixed duration; this shapes it.
// - **Damping ratio**: `1` settles without overshoot. Below `1` the value
//   overshoots and settles back. Reserve overshoot for motion that reads as
//   physical, so nothing bounces without a reason.

export interface Spring {
  mass: number;
  stiffness: number;
  damping: number;
}

/** Converts a response and damping ratio into an `Animated.spring` config. */
export const spring = (response: number, dampingRatio: number, mass = 1): Spring => {
  const omega = (2 * Math.PI) / response;
  return { mass, stiffness: mass * omega * omega, damping: 2 * dampingRatio * mass * omega };
};

export const motion = {
  /** The tab bar selection travelling to a new tab. Settles with a slight give. */
  tabSelect: spring(0.38, 0.9),
  /** A control compressing under a finger. No overshoot on the way down. */
  press: spring(0.22, 1),
  /** The same control returning once the finger lifts. */
  release: spring(0.34, 0.72),
} as const;
