import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, IconButton, MenuAction, MenuGroup, MoreGlyph, Sheet } from '../ui';
import { colors, radius, space, type } from '../../theme';
import { formatNumber } from '../../utils/format';
import type { ExerciseDetailData } from '../../utils/workoutTrackingResolver';
import { SetRow } from './SetRow';
import { ADD_ATTACHED_LABEL, badgeLabel, isAttached, mainSetProgress } from './setOps';
import type { AttachedSetType, ClientSetType, ExerciseSet, ExerciseTracking } from './types';

interface ExerciseCardProps {
  tracking: ExerciseTracking;
  detail: ExerciseDetailData;
  index: number;
  total: number;
  editable: boolean;
  /** The exercise the lifter is on: its border is brighter. */
  active: boolean;
  onChangeSet: (setIndex: number, field: 'weight' | 'reps', value: number) => void;
  onToggleSet: (setIndex: number, recommendedReps?: number) => void;
  onOpenSetMenu: (setIndex: number) => void;
  onAddSet: () => void;
  onAddAttached: (parentIndex: number, type: AttachedSetType) => void;
  onMove: (direction: 'up' | 'down') => void;
  onViewHistory: () => void;
  onRemove: () => void;
}

function lastFor(detail: ExerciseDetailData, set: ExerciseSet) {
  if (set.setNumber == null) return null;
  return (
    detail.lastSets.find(
      (s) => s.setNumber === set.setNumber && (s.subSetNumber ?? null) === (set.subSetNumber ?? null),
    ) ?? null
  );
}

/** An attached row's technique: its own type, else its parent's, else drop set. */
function attachedTypeOf(set: ExerciseSet, parentType: ClientSetType | undefined): AttachedSetType {
  if (set.setType && set.setType !== 'REGULAR') return set.setType;
  if (parentType && parentType !== 'REGULAR') return parentType;
  return 'DROP_SET';
}

/** The parent main set's type for each row, so attached rows know their technique. */
function parentTypes(sets: ExerciseSet[]): (ClientSetType | undefined)[] {
  let parent: ClientSetType | undefined;
  return sets.map((s) => {
    if (!isAttached(s)) {
      parent = s.setType;
      return undefined;
    }
    return parent;
  });
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  tracking,
  detail,
  index,
  total,
  editable,
  active,
  onChangeSet,
  onToggleSet,
  onOpenSetMenu,
  onAddSet,
  onAddAttached,
  onMove,
  onViewHistory,
  onRemove,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const sets = tracking.sets;
  const progress = mainSetProgress(sets);
  const doneVolume = sets.filter((s) => s.completed).reduce((t, s) => t + s.weight * s.reps, 0);
  const allDone = progress.total > 0 && progress.done === progress.total;
  const sub = allDone
    ? `Done · ${progress.total} ${progress.total === 1 ? 'set' : 'sets'} · ${formatNumber(doneVolume)} lb`
    : `${progress.done} of ${progress.total} sets${doneVolume > 0 ? ` · ${formatNumber(doneVolume)} lb so far` : ''}`;
  const parents = parentTypes(sets);

  // An action runs once the menu is gone. iOS drops an alert or a screen that
  // is presented while a sheet is still being dismissed, and the app is left
  // with an invisible modal over it that swallows every touch.
  const pending = useRef<(() => void) | null>(null);

  const close = (fn: () => void) => () => {
    pending.current = fn;
    setMenuOpen(false);
  };

  const runPending = () => {
    const fn = pending.current;
    pending.current = null;
    fn?.();
  };

  return (
    <View style={[styles.card, active && styles.cardActive]}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.name}>{tracking.exerciseName}</Text>
          <Text style={[styles.sub, allDone && styles.subDone]}>{sub}</Text>
        </View>
        <IconButton
          icon={<MoreGlyph color={colors.text.secondary} />}
          onPress={() => setMenuOpen(true)}
          accessibilityLabel={`${tracking.exerciseName} options`}
          variant="plain"
          size={30}
        />
      </View>

      {sets.length > 0 ? (
        <View style={styles.columns}>
          <Text style={[styles.column, styles.columnSet]}>SET</Text>
          <Text style={[styles.column, styles.columnField]}>WEIGHT</Text>
          <View style={styles.columnTimes} />
          <Text style={[styles.column, styles.columnField]}>REPS</Text>
          <View style={styles.columnCheck} />
          <View style={styles.columnMenu} />
        </View>
      ) : null}

      <View style={styles.rows}>
        {sets.map((set, setIndex) => {
          const attached = isAttached(set);
          const parentType = parents[setIndex];
          const technique = attached ? attachedTypeOf(set, parentType) : undefined;
          const last = lastFor(detail, set) ?? set.lastSet ?? null;
          const recommended = (last?.reps ?? 0) + 1;
          const next = sets[setIndex + 1];
          const endsGroup = attached && (!next || !isAttached(next));
          const groupParent = attached
            ? (() => {
                let i = setIndex;
                while (i > 0 && isAttached(sets[i])) i -= 1;
                return i;
              })()
            : setIndex;
          return (
            // Index keys keep a row mounted when its set gets a server id mid-edit.
            <React.Fragment key={setIndex}>
              <SetRow
                label={badgeLabel(set, parentType)}
                weight={set.weight}
                reps={set.reps}
                completed={!!set.completed}
                loading={set.loading}
                attachedType={technique}
                last={last}
                weightPlaceholder={last ? String(last.weight) : undefined}
                repsPlaceholder={last ? String(recommended) : undefined}
                editable={editable}
                onChangeWeight={(v) => onChangeSet(setIndex, 'weight', v)}
                onChangeReps={(v) => onChangeSet(setIndex, 'reps', v)}
                onToggle={() => onToggleSet(setIndex, !set.completed && !set.reps && last ? recommended : undefined)}
                onMenu={() => onOpenSetMenu(setIndex)}
              />
              {endsGroup && editable ? (
                <Pressable
                  onPress={() => onAddAttached(groupParent, technique!)}
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8 }}
                  style={styles.addAttached}
                >
                  <Text style={[styles.addAttachedText, { color: colors.technique[technique!].fg }]}>
                    {ADD_ATTACHED_LABEL[technique!]}
                  </Text>
                </Pressable>
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      {editable ? <Button label="+ Add set" variant="dashed" size="small" onPress={onAddSet} full /> : null}

      <Sheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onClosed={runPending}
        title={tracking.exerciseName}
      >
        <MenuGroup>
          {editable && index > 0 ? <MenuAction label="Move up" onPress={close(() => onMove('up'))} /> : null}
          {editable && index < total - 1 ? <MenuAction label="Move down" onPress={close(() => onMove('down'))} /> : null}
          <MenuAction label="View history" onPress={close(onViewHistory)} />
          {editable ? <MenuAction label="Remove exercise" destructive onPress={close(onRemove)} /> : null}
        </MenuGroup>
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.card,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingVertical: 13,
    paddingHorizontal: space.cardPad,
    gap: 10,
  },
  cardActive: {
    borderColor: colors.border.stronger,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  titles: {
    flex: 1,
    gap: 3,
  },
  name: {
    ...type.cardTitle,
    color: colors.text.primary,
  },
  sub: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  subDone: {
    color: colors.success.pillText,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 11,
    paddingRight: 8,
  },
  column: {
    ...type.tagSmall,
    letterSpacing: 0.5,
    color: colors.text.faint,
  },
  columnSet: {
    width: 26,
  },
  columnField: {
    flex: 1,
    textAlign: 'center',
  },
  columnTimes: {
    width: 10,
  },
  columnCheck: {
    width: 30,
  },
  columnMenu: {
    width: 20,
  },
  rows: {
    gap: 4,
  },
  addAttached: {
    marginLeft: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  addAttachedText: {
    ...type.metaSmall,
    fontWeight: '600',
  },
});
