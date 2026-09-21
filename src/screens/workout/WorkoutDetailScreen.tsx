import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { workoutService } from '../../services/workoutService';
import { useSchedule } from '../../context/ScheduleContext';
import { useWorkoutInstance } from '../../context/WorkoutInstanceContext';
import type { ExerciseDetailData } from '../../utils/workoutTrackingResolver';
import { ExerciseCard } from '../../components/logger/ExerciseCard';
import { SetMenuSheet } from '../../components/logger/SetMenuSheet';
import {
  addAttached,
  addSet,
  changeType,
  deleteSet,
  duplicateSet,
  insertSetBelow,
  isAttached,
  mainSetProgress,
  renumberedSaved,
} from '../../components/logger/setOps';
import type { AttachedSetType, ClientSetType, ExerciseSet, ExerciseTracking } from '../../components/logger/types';
import { AddExerciseSheet } from '../../components/exercise/AddExerciseSheet';
import {
  Button,
  Card,
  ChevronGlyph,
  EmptyState,
  ErrorState,
  IconButton,
  MenuAction,
  MenuGroup,
  MoreGlyph,
  PlusGlyph,
  Sheet,
  Skeleton,
  Tag,
} from '../../components/ui';
import { colors, radius, space, type } from '../../theme';
import { invalidateExerciseHistory } from '../../hooks/exerciseSessions';
import { invalidateMesocycles } from '../../hooks/mesocycleData';

type WorkoutDetailRoute = RouteProp<RootStackParamList, 'WorkoutDetail'>;
type WorkoutDetailNavigation = NativeStackNavigationProp<RootStackParamList, 'WorkoutDetail'>;

const EMPTY_DETAIL: ExerciseDetailData = { history: [], lastVolume: null, lastSets: [] };

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export const WorkoutDetailScreen: React.FC = () => {
  const route = useRoute<WorkoutDetailRoute>();
  const navigation = useNavigation<WorkoutDetailNavigation>();
  const insets = useSafeAreaInsets();
  const { workoutInstanceId } = route.params;
  const { refreshSchedule } = useSchedule();
  const {
    workoutInstance,
    loading,
    error,
    loadWorkoutData,
    trackingsMap,
    exerciseDetailsMap,
    trackingsLoading,
    updateExerciseTrackings,
    clearWorkoutTrackings,
    syncWorkoutInstance,
  } = useWorkoutInstance();

  const trackings = useMemo(() => trackingsMap[workoutInstanceId] ?? [], [trackingsMap, workoutInstanceId]);
  const [completing, setCompleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [setMenu, setSetMenu] = useState<{ exerciseIndex: number; setIndex: number } | null>(null);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    loadWorkoutData(workoutInstanceId);
  }, [workoutInstanceId, loadWorkoutData]);

  const reload = useCallback(async () => {
    clearWorkoutTrackings(workoutInstanceId);
    await loadWorkoutData(workoutInstanceId);
  }, [clearWorkoutTrackings, loadWorkoutData, workoutInstanceId]);

  // --- State helpers -------------------------------------------------------

  const setSets = useCallback(
    (exerciseIndex: number, update: (sets: ExerciseSet[]) => ExerciseSet[]) => {
      updateExerciseTrackings(workoutInstanceId, (prev) =>
        prev.map((t, i) => (i === exerciseIndex ? { ...t, sets: update(t.sets) } : t)),
      );
    },
    [updateExerciseTrackings, workoutInstanceId],
  );

  const patchSetById = useCallback(
    (exerciseIndex: number, id: number, patch: Partial<ExerciseSet>) => {
      setSets(exerciseIndex, (sets) => sets.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [setSets],
  );

  /**
   * Applies a new set list for one exercise and saves what changed: removed
   * sets are deleted, retyped sets are patched, and saved sets whose number
   * changed are deleted and posted again, because the API can't renumber a set.
   */
  const commit = useCallback(
    async (
      exerciseIndex: number,
      next: ExerciseSet[],
      removed: ExerciseSet[] = [],
      retyped: ExerciseSet[] = [],
    ) => {
      const tracking = trackings[exerciseIndex];
      if (!tracking) return;
      const before = tracking.sets;
      const moved = renumberedSaved(before, next);
      const movedIds = new Set(moved.map((s) => s.id));
      setSets(exerciseIndex, () => next.map((s) => (movedIds.has(s.id) ? { ...s, loading: true } : s)));
      setEdited(true);

      try {
        const removedIds = removed.filter((s) => s.id != null).map((s) => s.id as number);
        const toDelete = [...removedIds, ...moved.map((s) => s.id as number)];
        if (toDelete.length > 0) await workoutService.deleteSet(workoutInstanceId, toDelete);
        for (const s of retyped) {
          if (s.id != null && !movedIds.has(s.id)) {
            await workoutService.convertSetType(workoutInstanceId, s.id, s.setType ?? 'REGULAR');
          }
        }
        for (const s of moved) {
          const response = await workoutService.addSet(
            workoutInstanceId,
            tracking.exerciseId,
            s.weight,
            s.reps,
            s.setNumber ?? 1,
            s.subSetNumber ?? null,
            s.setType ?? 'REGULAR',
          );
          patchSetById(exerciseIndex, s.id as number, { id: response?.[0]?.id, loading: false });
        }
      } catch (err) {
        Alert.alert("Couldn't save that change", errorText(err, 'Your sets were reloaded.'));
        await reload();
      }
    },
    [trackings, setSets, patchSetById, workoutInstanceId, reload],
  );

  // --- Set handlers --------------------------------------------------------

  const handleChangeSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    setSets(exerciseIndex, (sets) => sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s)));
  };

  const handleToggleSet = async (exerciseIndex: number, setIndex: number, recommendedReps?: number) => {
    const tracking = trackings[exerciseIndex];
    const set = tracking?.sets[setIndex];
    if (!tracking || !set) return;
    setEdited(true);

    if (set.completed && set.id) {
      setSets(exerciseIndex, (sets) =>
        sets.map((s, i) => (i === setIndex ? { ...s, id: undefined, completed: false, loading: false } : s)),
      );
      try {
        await workoutService.deleteSet(workoutInstanceId, [set.id]);
      } catch (err) {
        setSets(exerciseIndex, (sets) =>
          sets.map((s, i) => (i === setIndex ? { ...s, id: set.id, completed: true, loading: false } : s)),
        );
        Alert.alert("Couldn't uncheck the set", errorText(err, 'Try again.'));
      }
      return;
    }

    if (set.completed) return;
    const weight = set.weight || set.lastSet?.weight || 0;
    const reps = set.reps || (recommendedReps ?? set.lastSet?.reps ?? 0);
    setSets(exerciseIndex, (sets) =>
      sets.map((s, i) => (i === setIndex ? { ...s, completed: true, loading: true, weight, reps } : s)),
    );
    try {
      const response = await workoutService.addSet(
        workoutInstanceId,
        tracking.exerciseId,
        weight,
        reps,
        set.setNumber || setIndex + 1,
        set.subSetNumber ?? null,
        set.setType || 'REGULAR',
      );
      const newId = response?.[0]?.id;
      setSets(exerciseIndex, (sets) =>
        sets.map((s, i) => (i === setIndex ? { ...s, id: newId, completed: true, loading: false } : s)),
      );
    } catch (err) {
      setSets(exerciseIndex, (sets) =>
        sets.map((s, i) => (i === setIndex ? { ...s, id: undefined, completed: false, loading: false } : s)),
      );
      Alert.alert("Couldn't log the set", errorText(err, 'Try again.'));
    }
  };

  const handleAddSet = (exerciseIndex: number) => {
    const t = trackings[exerciseIndex];
    if (t) commit(exerciseIndex, addSet(t.sets));
  };

  const handleAddAttached = (exerciseIndex: number, parentIndex: number, technique: AttachedSetType) => {
    const t = trackings[exerciseIndex];
    if (t) commit(exerciseIndex, addAttached(t.sets, parentIndex, technique));
  };

  const closeSetMenu = () => setSetMenu(null);

  const handleChooseType = (setType: ClientSetType) => {
    if (!setMenu) return;
    const { exerciseIndex, setIndex } = setMenu;
    const t = trackings[exerciseIndex];
    const parent = t?.sets[setIndex];
    closeSetMenu();
    if (!t || !parent || (parent.setType ?? 'REGULAR') === setType) return;

    const { sets: next, removed } = changeType(t.sets, setIndex, setType);
    const retyped = next.filter((s) => {
      if (s.id == null) return false;
      const prev = t.sets.find((p) => p.id === s.id);
      return !!prev && (prev.setType ?? 'REGULAR') !== (s.setType ?? 'REGULAR');
    });
    const apply = () => commit(exerciseIndex, next, removed, retyped);

    if (setType === 'REGULAR' && removed.length > 0) {
      Alert.alert(
        'Make this a straight set?',
        `This removes ${removed.length} attached ${removed.length === 1 ? 'set' : 'sets'}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: apply },
        ],
      );
    } else {
      apply();
    }
  };

  const withMenuSet = (fn: (exerciseIndex: number, sets: ExerciseSet[], setIndex: number) => void) => () => {
    if (!setMenu) return;
    const { exerciseIndex, setIndex } = setMenu;
    const t = trackings[exerciseIndex];
    closeSetMenu();
    if (t) fn(exerciseIndex, t.sets, setIndex);
  };

  const handleDuplicate = withMenuSet((ei, sets, si) => commit(ei, duplicateSet(sets, si)));
  const handleInsertBelow = withMenuSet((ei, sets, si) => commit(ei, insertSetBelow(sets, si)));
  const handleDeleteSet = withMenuSet((ei, sets, si) => {
    const { sets: next, removed } = deleteSet(sets, si);
    commit(ei, next, removed);
  });

  // --- Exercise handlers ---------------------------------------------------

  const handleMove = async (exerciseIndex: number, direction: 'up' | 'down') => {
    const t = trackings[exerciseIndex];
    if (!t) return;
    try {
      await workoutService.reorderExercise(workoutInstanceId, t.exerciseId, direction);
      const updated = await workoutService.getWorkoutInstance(workoutInstanceId);
      await syncWorkoutInstance(workoutInstanceId, updated);
    } catch (err) {
      Alert.alert("Couldn't move the exercise", errorText(err, 'Try again.'));
    }
  };

  const handleRemove = (exerciseIndex: number) => {
    const t = trackings[exerciseIndex];
    if (!t) return;
    Alert.alert(`Remove ${t.exerciseName}?`, 'Its logged sets in this workout are removed too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await workoutService.removeExercise(workoutInstanceId, t.exerciseId);
            await syncWorkoutInstance(workoutInstanceId, updated);
            setEdited(true);
          } catch (err) {
            Alert.alert("Couldn't remove the exercise", errorText(err, 'Try again.'));
          }
        },
      },
    ]);
  };

  const handleAddExercises = async (exercises: { id: number }[]) => {
    const updated = await workoutService.addExercise(
      workoutInstanceId,
      exercises.map((e) => e.id),
    );
    await syncWorkoutInstance(workoutInstanceId, updated);
    setEdited(true);
    setAddOpen(false);
  };

  // --- Finish --------------------------------------------------------------

  const allSets = trackings.flatMap((t) => t.sets);
  const progress = mainSetProgress(allSets);
  const isCompleted = !!workoutInstance?.completedAt;

  const finish = async () => {
    try {
      setCompleting(true);
      await workoutService.completeWorkout(workoutInstanceId);
      clearWorkoutTrackings(workoutInstanceId);
      invalidateExerciseHistory();
      invalidateMesocycles();
      try {
        await refreshSchedule();
      } catch {
        // Today refreshes again on focus.
      }
      navigation.replace('WorkoutComplete', { workoutInstanceId });
    } catch (err) {
      Alert.alert("Couldn't finish the workout", errorText(err, 'Try again.'));
    } finally {
      setCompleting(false);
    }
  };

  const handleFinish = () => {
    const unchecked = progress.total - progress.done;
    if (unchecked > 0) {
      Alert.alert(
        `${unchecked} ${unchecked === 1 ? "set isn't" : "sets aren't"} checked. Finish anyway?`,
        'Unchecked sets are not saved.',
        [
          { text: 'Keep logging', style: 'cancel' },
          { text: 'Finish', onPress: finish },
        ],
      );
    } else {
      finish();
    }
  };

  const handleDone = async () => {
    if (edited) {
      clearWorkoutTrackings(workoutInstanceId);
      invalidateExerciseHistory();
      invalidateMesocycles();
      refreshSchedule().catch(() => undefined);
    }
    navigation.goBack();
  };

  // --- Render --------------------------------------------------------------

  const pid = workoutInstance?.planInstanceDays?.[0];
  const planInstance = pid?.planInstance;
  const hasPlan = pid?.planDay != null && planInstance != null;
  const title = workoutInstance?.workout?.name ?? 'Workout';
  const meta = hasPlan
    ? [planInstance?.mesocycle?.name, planInstance?.iterationNumber != null && `Week ${planInstance.iterationNumber}`, pid?.planDay?.dayNumber != null && `Day ${pid.planDay.dayNumber}`]
        .filter(Boolean)
        .join(' · ')
    : 'Off-plan';
  const rir = hasPlan ? planInstance?.rir : null;
  const activeIndex = trackings.findIndex((t) => t.sets.some((s) => !isAttached(s) && !s.completed));
  const menuTracking: ExerciseTracking | undefined = setMenu ? trackings[setMenu.exerciseIndex] : undefined;
  const menuSet = setMenu && menuTracking ? menuTracking.sets[setMenu.setIndex] : undefined;
  const menuParentIndex = (() => {
    if (!setMenu || !menuTracking) return 0;
    let i = setMenu.setIndex;
    while (i > 0 && isAttached(menuTracking.sets[i])) i -= 1;
    return i;
  })();
  const menuLabel = menuSet
    ? isAttached(menuSet)
      ? `Set ${menuSet.setNumber}.${menuSet.subSetNumber}`
      : `Set ${menuSet.setNumber}`
    : '';
  const menuValues =
    menuSet && (menuSet.weight || menuSet.reps)
      ? `${menuSet.weight} × ${menuSet.reps}`
      : menuSet?.lastSet
        ? `Last ${menuSet.lastSet.weight} × ${menuSet.lastSet.reps}`
        : null;

  const loadingFirst = (loading || trackingsLoading) && trackings.length === 0;
  const pct = progress.total > 0 ? progress.done / progress.total : 0;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.screenTop, paddingBottom: 110 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.nav}>
          <IconButton
            icon={<ChevronGlyph direction="left" size={16} color={colors.text.body} strokeWidth={2} />}
            onPress={isCompleted ? handleDone : () => navigation.goBack()}
            accessibilityLabel="Back"
            size={34}
          />
          <View style={styles.navTitles}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {isCompleted ? `${meta} · Editing a finished workout` : meta}
            </Text>
          </View>
          <IconButton
            icon={<MoreGlyph color={colors.text.secondary} />}
            onPress={() => setOptionsOpen(true)}
            accessibilityLabel="Workout options"
            size={34}
          />
        </View>

        {error && trackings.length === 0 ? (
          <ErrorState onRetry={reload} />
        ) : loadingFirst ? (
          <>
            <Skeleton height={62} />
            <Skeleton height={220} />
            <Skeleton height={180} />
          </>
        ) : (
          <>
            <Card padding={14} gap={10}>
              <View style={styles.stripRow}>
                {rir != null ? <Tag label={`TARGET RIR ${rir}`} /> : null}
                <View style={styles.flex} />
                <Text style={styles.stripCount}>
                  <Text style={styles.stripDone}>{progress.done}</Text> of {progress.total} sets
                </Text>
              </View>
              <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: progress.total, now: progress.done }}>
                <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
              </View>
            </Card>

            {trackings.length === 0 ? (
              <EmptyState message="No exercises yet. Add one to start logging." action={{ label: 'Add exercise', onPress: () => setAddOpen(true) }} />
            ) : (
              trackings.map((t, i) => (
                <ExerciseCard
                  key={t.exerciseId}
                  tracking={t}
                  detail={exerciseDetailsMap[t.exerciseId] ?? EMPTY_DETAIL}
                  index={i}
                  total={trackings.length}
                  editable
                  active={i === activeIndex && !isCompleted}
                  onChangeSet={(si, field, value) => handleChangeSet(i, si, field, value)}
                  onToggleSet={(si, reps) => handleToggleSet(i, si, reps)}
                  onOpenSetMenu={(si) => setSetMenu({ exerciseIndex: i, setIndex: si })}
                  onAddSet={() => handleAddSet(i)}
                  onAddAttached={(pi, technique) => handleAddAttached(i, pi, technique)}
                  onMove={(dir) => handleMove(i, dir)}
                  onViewHistory={() => navigation.navigate('ExerciseDetail', { exerciseId: t.exerciseId })}
                  onRemove={() => handleRemove(i)}
                />
              ))
            )}

            {trackings.length > 0 ? (
              <Button label="Add exercise" variant="dashed" icon={<PlusGlyph />} onPress={() => setAddOpen(true)} full />
            ) : null}
          </>
        )}
      </ScrollView>

      {trackings.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
          {isCompleted ? (
            <Button label="Done" onPress={handleDone} full />
          ) : (
            <Button
              label={`Finish workout · ${progress.done} of ${progress.total} sets`}
              onPress={handleFinish}
              loading={completing}
              full
            />
          )}
        </View>
      ) : null}

      <Sheet visible={optionsOpen} onClose={() => setOptionsOpen(false)} title={title} subtitle={meta}>
        <MenuGroup>
          <MenuAction
            label="Add exercise"
            onPress={() => {
              setOptionsOpen(false);
              setAddOpen(true);
            }}
          />
          {!isCompleted && trackings.length > 0 ? (
            <MenuAction
              label="Finish workout"
              onPress={() => {
                setOptionsOpen(false);
                handleFinish();
              }}
            />
          ) : null}
        </MenuGroup>
      </Sheet>

      <SetMenuSheet
        visible={!!menuSet}
        onClose={closeSetMenu}
        title={menuLabel}
        subtitle={[menuTracking?.exerciseName, menuValues].filter(Boolean).join(' · ')}
        attached={!!menuSet && isAttached(menuSet)}
        currentType={(menuTracking?.sets[menuParentIndex]?.setType ?? 'REGULAR') as ClientSetType}
        onChooseType={handleChooseType}
        onDuplicate={handleDuplicate}
        onInsertBelow={handleInsertBelow}
        onDelete={handleDeleteSet}
      />

      <AddExerciseSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        subtitle={[title, hasPlan ? meta.split(' · ').slice(1).join(' · ') : 'Off-plan'].filter(Boolean).join(' · ')}
        onAdd={handleAddExercises}
        excludeIds={trackings.map((t) => t.exerciseId)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: space.gutter,
    gap: space.cardGap,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navTitles: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...type.cardTitle,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  meta: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  stripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  stripCount: {
    ...type.meta,
    color: colors.text.secondary,
  },
  stripDone: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  track: {
    height: 6,
    borderRadius: radius.cell,
    backgroundColor: colors.border.track,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: radius.cell,
    backgroundColor: colors.success.base,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: space.gutter,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
  },
});
