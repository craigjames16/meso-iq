import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { plansService } from '../../services/plansService';
import type { PlanDayInput } from '../../types/plan';
import {
  ALL_MUSCLES,
  DEFAULT_STARTING_SETS,
  GROWTH_TARGET_SETS,
  LOW_VOLUME_SETS,
  lowVolumeMuscles,
  programVolumeProfile,
  repRangeLabel,
  toMuscle,
} from '../../analytics';
import { invalidatePlans } from '../../hooks/usePlans';
import { ProfileBars } from '../../components/charts';
import {
  Button,
  Card,
  ChevronGlyph,
  ErrorState,
  MenuAction,
  MenuGroup,
  PlusGlyph,
  ReorderGlyph,
  SectionLabel,
  Segmented,
  Sheet,
  Skeleton,
  Stepper,
  TextField,
  WarningGlyph,
} from '../../components/ui';
import { AddExerciseSheet } from '../../components/exercise/AddExerciseSheet';
import { features } from '../../config/features';
import { colors, muscleLabel, muscleShort, radius, space, type } from '../../theme';
import { isDefaultDayName, workoutDisplayName } from '../../utils/names';

type Route = RouteProp<RootStackParamList, 'EditPlan'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'EditPlan'>;

interface BuilderExercise {
  key: string;
  id: number;
  name: string;
  category: string;
  repMin: number | null;
  repMax: number | null;
  startingSets: number | null;
}

interface BuilderDay {
  key: string;
  /** Empty until the lifter names the day; the display falls back to its muscles. */
  name: string;
  isRestDay: boolean;
  exercises: BuilderExercise[];
}

let keySeq = 0;
const nextKey = (prefix: string) => `${prefix}-${++keySeq}`;

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function dayLabel(day: BuilderDay, index: number): string {
  if (day.isRestDay) return 'Rest';
  return day.name.trim() || workoutDisplayName(null, day.exercises.map((e) => e.category), index + 1);
}

function snapshot(name: string, days: BuilderDay[]): string {
  return JSON.stringify({
    name,
    days: days.map((d) => ({ n: d.name, r: d.isRestDay, e: d.exercises.map((e) => [e.id, e.repMin, e.repMax, e.startingSets]) })),
  });
}

export const EditPlanScreen: React.FC = () => {
  const { params } = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const planId = params?.planId;
  const [name, setName] = useState('');
  const [days, setDays] = useState<BuilderDay[]>([]);
  const [loading, setLoading] = useState(planId != null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [targetsFor, setTargetsFor] = useState<{ day: string; ex: string } | null>(null);
  const [menu, setMenu] = useState<{ day: string; ex?: string } | null>(null);
  const initial = useRef<string>(snapshot('', []));

  const load = useCallback(async () => {
    if (planId == null) {
      const first: BuilderDay = { key: nextKey('day'), name: '', isRestDay: false, exercises: [] };
      setDays([first]);
      setExpanded(first.key);
      initial.current = snapshot('', [first]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const plan = await plansService.getPlan(planId);
      const loaded: BuilderDay[] = [...(plan.days ?? [])]
        .sort((a, b) => a.dayNumber - b.dayNumber)
        .map((d) => ({
          key: nextKey('day'),
          name: d.workout?.name && !isDefaultDayName(d.workout.name) ? d.workout.name : '',
          isRestDay: d.isRestDay,
          exercises: [...(d.workout?.workoutExercises ?? [])]
            .sort((a, b) => a.order - b.order)
            .map((we) => ({
              key: nextKey('ex'),
              id: we.exercise.id,
              name: we.exercise.name,
              category: we.exercise.category,
              repMin: we.repMin ?? null,
              repMax: we.repMax ?? null,
              startingSets: we.startingSets ?? null,
            })),
        }));
      setName(plan.name);
      setDays(loaded);
      setExpanded(loaded.find((d) => !d.isRestDay)?.key ?? null);
      initial.current = snapshot(plan.name, loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = snapshot(name, days) !== initial.current;
  const training = days.filter((d) => !d.isRestDay);
  const problems = [
    !name.trim() && 'Name the program.',
    training.length === 0 && 'Add at least one training day.',
    training.some((d) => d.exercises.length === 0) && 'Every training day needs an exercise.',
  ].filter(Boolean) as string[];
  const valid = problems.length === 0;

  const profile = useMemo(
    () =>
      programVolumeProfile(
        training.map((d) => ({
          exercises: d.exercises.map((e) => ({
            muscle: toMuscle(e.category),
            startingSets: features.PROGRAM_TARGETS ? e.startingSets : null,
          })),
        })),
      ),
    [training],
  );
  const exerciseCount = training.reduce((n, d) => n + d.exercises.length, 0);
  const startingSets = ALL_MUSCLES.reduce((n, m) => n + profile[m], 0);
  const lowest = lowVolumeMuscles(profile)[0];

  // --- Edits ---------------------------------------------------------------

  const updateDay = (key: string, fn: (d: BuilderDay) => BuilderDay) => setDays((prev) => prev.map((d) => (d.key === key ? fn(d) : d)));

  const setRest = (day: BuilderDay, rest: boolean) => {
    if (rest && day.exercises.length > 0) {
      Alert.alert('Make this a rest day?', `This clears its ${day.exercises.length} ${day.exercises.length === 1 ? 'exercise' : 'exercises'}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Make rest day', style: 'destructive', onPress: () => updateDay(day.key, (d) => ({ ...d, isRestDay: true, exercises: [] })) },
      ]);
      return;
    }
    updateDay(day.key, (d) => ({ ...d, isRestDay: rest }));
    if (!rest) setExpanded(day.key);
  };

  const addDay = () => {
    const d: BuilderDay = { key: nextKey('day'), name: '', isRestDay: false, exercises: [] };
    setDays((prev) => [...prev, d]);
    setExpanded(d.key);
  };

  const menuDayIndex = menu ? days.findIndex((d) => d.key === menu.day) : -1;
  const menuDay = menuDayIndex >= 0 ? days[menuDayIndex] : null;
  const menuExIndex = menuDay && menu?.ex ? menuDay.exercises.findIndex((e) => e.key === menu.ex) : -1;

  const closeMenu = (fn: () => void) => () => {
    setMenu(null);
    fn();
  };

  const targetDay = targetsFor ? days.find((d) => d.key === targetsFor.day) : undefined;
  const targetEx = targetDay?.exercises.find((e) => e.key === targetsFor?.ex);
  const setTarget = (patch: Partial<BuilderExercise>) => {
    if (!targetsFor) return;
    updateDay(targetsFor.day, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.key === targetsFor.ex ? { ...e, ...patch } : e)) }));
  };

  // --- Save and cancel -----------------------------------------------------

  const cancel = () => {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    Alert.alert('Discard changes?', 'Your edits to this program are not saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const save = async () => {
    if (!valid) {
      Alert.alert("Can't save yet", problems.join('\n'));
      return;
    }
    const payload: PlanDayInput[] = days.map((d) => ({
      ...(features.DAY_NAMES && d.name.trim() ? { name: d.name.trim().slice(0, 40) } : {}),
      isRestDay: d.isRestDay,
      workoutExercises: d.exercises.map((e, i) => ({
        id: e.id,
        order: i + 1,
        ...(features.PROGRAM_TARGETS ? { repMin: e.repMin, repMax: e.repMax, startingSets: e.startingSets } : {}),
      })),
    }));
    setSaving(true);
    try {
      if (planId != null) {
        await plansService.updatePlan(planId, { name: name.trim(), days: payload });
        invalidatePlans();
        initial.current = snapshot(name, days);
        navigation.goBack();
      } else {
        const created = await plansService.createPlan({ name: name.trim(), days: payload });
        invalidatePlans();
        initial.current = snapshot(name, days);
        navigation.replace('PlanDetail', { planId: created.id });
      }
    } catch (err) {
      Alert.alert("Couldn't save the program", err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- Render --------------------------------------------------------------

  const addDayObj = days.find((d) => d.key === addFor);
  const addDayIndex = days.findIndex((d) => d.key === addFor);

  return (
    <View style={styles.root}>
      <View style={[styles.nav, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={cancel} accessibilityRole="button" hitSlop={10} style={styles.navHit}>
          <Text style={styles.navText}>Cancel</Text>
        </Pressable>
        <Text style={styles.navTitle} accessibilityRole="header">
          {planId != null && !params?.draftFromAI ? 'Edit program' : 'New program'}
        </Text>
        <Pressable onPress={save} disabled={saving} accessibilityRole="button" hitSlop={10} style={styles.navHit}>
          <Text style={[styles.navText, styles.navSave, !valid && styles.navSaveInvalid]}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: 110 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {error ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <>
            <Skeleton height={70} />
            <Skeleton height={140} />
            <Skeleton height={220} />
          </>
        ) : (
          <>
            {params?.draftFromAI ? (
              <Card variant="subtle">
                <Text style={styles.meta}>The draft is saved as a program. Change anything before you start a cycle.</Text>
              </Card>
            ) : null}
            <TextField label="NAME" value={name} onChangeText={setName} placeholder="Upper / Lower 4×" />

            <Card padding={16} gap={12}>
              <View style={styles.readoutHead}>
                <SectionLabel>AS YOU BUILD IT</SectionLabel>
                <Text style={styles.meta}>
                  {training.length} {training.length === 1 ? 'day' : 'days'} · {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'} ·{' '}
                  {startingSets} starting sets
                </Text>
              </View>
              <ProfileBars
                bars={ALL_MUSCLES.map((m) => ({ label: muscleShort(m), value: profile[m], warn: profile[m] > 0 && profile[m] < LOW_VOLUME_SETS }))}
                height={40}
              />
              {lowest ? (
                <View style={styles.warn}>
                  <WarningGlyph size={14} />
                  <Text style={styles.warnText}>
                    {muscleLabel(lowest)} {lowest === 'BACK' || lowest === 'CHEST' ? 'gets' : 'get'}{' '}
                    {profile[lowest]} {profile[lowest] === 1 ? 'set' : 'sets'} a week. Most muscles need {GROWTH_TARGET_SETS} or more to grow.
                  </Text>
                </View>
              ) : null}
            </Card>

            {days.map((day, index) => {
              const label = dayLabel(day, index);
              const open = !day.isRestDay && expanded === day.key;
              const sets = day.exercises.reduce(
                (n, e) => n + ((features.PROGRAM_TARGETS ? e.startingSets : null) ?? DEFAULT_STARTING_SETS),
                0,
              );
              if (day.isRestDay) {
                return (
                  <Pressable
                    key={day.key}
                    onLongPress={() => setMenu({ day: day.key })}
                    accessibilityHint="Long-press to move or remove"
                    style={styles.restDay}
                  >
                    <ReorderGlyph />
                    <Text style={[styles.dayTitle, styles.restTitle]}>Day {index + 1} · Rest</Text>
                    <View style={styles.segment}>
                      <Segmented size="small" options={[{ value: 'work', label: 'Work' }, { value: 'rest', label: 'Rest' }]} value="rest" onChange={(v) => setRest(day, v === 'rest')} />
                    </View>
                  </Pressable>
                );
              }
              return (
                <Card key={day.key} gap={10} padding={14}>
                  <Pressable
                    onPress={() => setExpanded(open ? null : day.key)}
                    onLongPress={() => setMenu({ day: day.key })}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityHint="Long-press to move or remove the day"
                    style={styles.dayHead}
                  >
                    <ReorderGlyph />
                    {features.DAY_NAMES && open ? (
                      <View style={styles.nameRow}>
                        <Text style={styles.dayTitle}>Day {index + 1} · </Text>
                        <TextInput
                          value={day.name}
                          onChangeText={(t) => updateDay(day.key, (d) => ({ ...d, name: t }))}
                          placeholder={workoutDisplayName(null, day.exercises.map((e) => e.category), index + 1)}
                          placeholderTextColor={colors.text.faint}
                          maxLength={40}
                          accessibilityLabel={`Day ${index + 1} name`}
                          keyboardAppearance="dark"
                          style={[styles.dayTitle, styles.nameInput]}
                        />
                      </View>
                    ) : (
                      <Text style={[styles.dayTitle, styles.flex]} numberOfLines={1}>
                        Day {index + 1} · {label}
                      </Text>
                    )}
                    {!open ? (
                      <>
                        <Text style={styles.meta}>
                          {day.exercises.length} ex · {sets} sets
                        </Text>
                        <ChevronGlyph />
                      </>
                    ) : null}
                  </Pressable>
                  {open ? (
                    <>
                      <Segmented size="small" options={[{ value: 'work', label: 'Work' }, { value: 'rest', label: 'Rest' }]} value="work" onChange={(v) => setRest(day, v === 'rest')} />
                      <View>
                        {day.exercises.length === 0 ? <Text style={styles.meta}>No exercises yet.</Text> : null}
                        {day.exercises.map((e, i) => {
                          const range = repRangeLabel(e.repMin, e.repMax);
                          return (
                            <Pressable
                              key={e.key}
                              onLongPress={() => setMenu({ day: day.key, ex: e.key })}
                              accessibilityHint="Long-press to move or remove"
                              style={[styles.exRow, i > 0 && styles.divider]}
                            >
                              <ReorderGlyph />
                              <Text style={styles.exName} numberOfLines={1}>
                                {e.name}
                              </Text>
                              {features.PROGRAM_TARGETS ? (
                                <Pressable
                                  onPress={() => setTargetsFor({ day: day.key, ex: e.key })}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${e.name} targets`}
                                  hitSlop={8}
                                  style={styles.spec}
                                >
                                  <Text style={styles.specText}>{range ? `${range} reps` : 'Set reps'}</Text>
                                </Pressable>
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                      <Button label="Add exercise" variant="dashed" size="small" icon={<PlusGlyph />} onPress={() => setAddFor(day.key)} full />
                      {index === days.findIndex((d) => !d.isRestDay) ? (
                        <Text style={styles.hint}>
                          {features.DAY_NAMES ? 'Tap a day name to rename it. ' : ''}Long-press a row to move or remove it.
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                </Card>
              );
            })}

            <Button label="Add day" variant="dashed" icon={<PlusGlyph />} onPress={addDay} full />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Button label="Save program" onPress={save} loading={saving} disabled={loading} full />
      </View>

      <AddExerciseSheet
        visible={addFor != null}
        onClose={() => setAddFor(null)}
        subtitle={addDayObj ? `Day ${addDayIndex + 1} · ${dayLabel(addDayObj, addDayIndex)}` : undefined}
        excludeIds={addDayObj?.exercises.map((e) => e.id) ?? []}
        onAdd={(list) => {
          if (!addFor) return;
          updateDay(addFor, (d) => ({
            ...d,
            exercises: [
              ...d.exercises,
              ...list.map((e) => ({ key: nextKey('ex'), id: e.id, name: e.name, category: e.category, repMin: null, repMax: null, startingSets: null })),
            ],
          }));
          setAddFor(null);
        }}
      />

      <Sheet visible={menu != null} onClose={() => setMenu(null)} title={menuDay ? (menuExIndex >= 0 ? menuDay.exercises[menuExIndex].name : `Day ${menuDayIndex + 1}`) : ''}>
        {menuDay && menuExIndex >= 0 ? (
          <MenuGroup>
            {menuExIndex > 0 ? (
              <MenuAction label="Move up" onPress={closeMenu(() => updateDay(menuDay.key, (d) => ({ ...d, exercises: move(d.exercises, menuExIndex, menuExIndex - 1) })))} />
            ) : null}
            {menuExIndex < menuDay.exercises.length - 1 ? (
              <MenuAction label="Move down" onPress={closeMenu(() => updateDay(menuDay.key, (d) => ({ ...d, exercises: move(d.exercises, menuExIndex, menuExIndex + 1) })))} />
            ) : null}
            <MenuAction
              label="Remove exercise"
              destructive
              onPress={closeMenu(() => updateDay(menuDay.key, (d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== menuExIndex) })))}
            />
          </MenuGroup>
        ) : menuDay ? (
          <MenuGroup>
            {menuDayIndex > 0 ? <MenuAction label="Move up" onPress={closeMenu(() => setDays((p) => move(p, menuDayIndex, menuDayIndex - 1)))} /> : null}
            {menuDayIndex < days.length - 1 ? <MenuAction label="Move down" onPress={closeMenu(() => setDays((p) => move(p, menuDayIndex, menuDayIndex + 1)))} /> : null}
            <MenuAction label="Remove day" destructive onPress={closeMenu(() => setDays((p) => p.filter((_, i) => i !== menuDayIndex)))} />
          </MenuGroup>
        ) : null}
      </Sheet>

      <Sheet visible={!!targetEx} onClose={() => setTargetsFor(null)} title={targetEx?.name ?? ''} subtitle="Rep range and week-1 sets">
        {targetEx ? (
          <View style={styles.targets}>
            {[
              { label: 'Rep min', value: targetEx.repMin ?? 8, min: 1, max: targetEx.repMax ?? 50, set: (v: number) => setTarget({ repMin: v, repMax: Math.max(v, targetEx.repMax ?? v) }) },
              { label: 'Rep max', value: targetEx.repMax ?? 12, min: targetEx.repMin ?? 1, max: 50, set: (v: number) => setTarget({ repMax: v, repMin: targetEx.repMin ?? Math.min(8, v) }) },
              { label: 'Starting sets', value: targetEx.startingSets ?? DEFAULT_STARTING_SETS, min: 1, max: 10, set: (v: number) => setTarget({ startingSets: v }) },
            ].map((row) => (
              <View key={row.label} style={styles.targetRow}>
                <Text style={[styles.dayTitle, styles.flex]}>{row.label}</Text>
                <Stepper label={row.label} value={row.value} min={row.min} max={row.max} onChange={row.set} />
              </View>
            ))}
          </View>
        ) : null}
      </Sheet>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.gutter,
    paddingBottom: 6,
  },
  navHit: { minHeight: 44, minWidth: 60, justifyContent: 'center' },
  navText: { ...type.body, color: colors.text.body },
  navTitle: { ...type.sheetTitle, color: colors.text.primary },
  navSave: { fontWeight: '600', textAlign: 'right', color: colors.action.fill },
  navSaveInvalid: { color: colors.data.reference },
  content: { paddingHorizontal: space.gutter, paddingTop: space.screenTop, gap: space.cardGap },
  meta: { ...type.metaSmall, color: colors.text.muted },
  readoutHead: { gap: 4 },
  warn: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  warnText: { flex: 1, ...type.meta, color: colors.warning.base },
  flex: { flex: 1 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  dayTitle: { ...type.cardTitle, color: colors.text.primary },
  nameRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  nameInput: {
    flex: 1,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderBottomColor: colors.border.stronger,
  },
  restDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.divider,
    backgroundColor: colors.surface.subtle,
  },
  restTitle: { flex: 1, color: colors.text.faint, fontWeight: '400' },
  segment: { width: 130 },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, minHeight: 44 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border.divider },
  exName: { flex: 1, ...type.body, color: colors.text.body },
  spec: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: radius.field,
    backgroundColor: colors.surface.field,
  },
  specText: { ...type.metaSmall, color: colors.text.secondary },
  hint: { ...type.metaSmall, color: colors.text.faint },
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
  targets: { gap: 12 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
