import React from 'react';
import { ListRow } from '../ui';
import { sessionTotals, tonnageDeltaVsLast, type MuscleOf, type Session } from '../../analytics';
import { formatNumber } from '../../utils/format';
import { sessionMeta, sessionTitle } from './sessionText';

interface SessionRowProps {
  session: Session;
  /** Every completed session, for the delta against the previous session of the same workout. */
  sessions: Session[];
  dayNumber?: number | null;
  muscleOf?: MuscleOf;
  onPress?: () => void;
  divider?: boolean;
}

export const SessionRow: React.FC<SessionRowProps> = ({ session, sessions, dayNumber, muscleOf, onPress, divider }) => (
  <ListRow
    title={sessionTitle(session, dayNumber, muscleOf)}
    meta={sessionMeta(session)}
    value={formatNumber(sessionTotals(session).tonnage)}
    delta={tonnageDeltaVsLast(session, sessions)}
    onPress={onPress}
    divider={divider}
  />
);
