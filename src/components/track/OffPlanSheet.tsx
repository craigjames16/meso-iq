import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, CheckCircleGlyph, ChevronGlyph, OptionCard, Sheet } from '../ui';
import { colors, type } from '../../theme';
import { workoutService } from '../../services/workoutService';
import { usePlans } from '../../hooks/usePlans';
import type { Session } from '../../analytics';
import type { Plan } from '../../types/plan';
import { sessionMeta } from '../session/sessionText';

type Source = 'repeat' | 'program' | 'empty';

interface OffPlanSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Completed sessions, oldest first. */
  sessions: Session[];
  onStarted: (workoutInstanceId: number) => void;
}

const RECENT_COUNT = 3;

function sessionExerciseIds(session: Session): number[] {
  const ids = [...(session.exerciseOrder ?? [])];
  for (const s of session.sets) if (!ids.includes(s.exerciseId)) ids.push(s.exerciseId);
  return ids;
}

function dayLabel(day: Plan['days'][number]): string {
  const name = day.workout?.name?.replace(/^.* - Day \d+$/, '') || '';
  return name ? `Day ${day.dayNumber} · ${name}` : `Day ${day.dayNumber}`;
}

/** Name for the off-plan session: the source workout's name, or "Workout". */
function dayWorkoutName(plan: Plan, day: Plan['days'][number]): string {
  const name = day.workout?.name ?? '';
  return /- Day \d+$/.test(name) || !name ? `${plan.name} · Day ${day.dayNumber}` : name;
}

export const OffPlanSheet: React.FC<OffPlanSheetProps> = ({ visible, onClose, sessions, onStarted }) => {
  const plans = usePlans();
  const [source, setSource] = useState<Source>('repeat');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [openPlanId, setOpenPlanId] = useState<number | null>(null);
  const [day, setDay] = useState<{ planId: number; dayId: number } | null>(null);
  const [starting, setStarting] = useState(false);

  const recent = useMemo(() => [...sessions].reverse().slice(0, RECENT_COUNT), [sessions]);

  useEffect(() => {
    if (visible) {
      setSource(recent.length > 0 ? 'repeat' : 'empty');
      setSessionId(recent[0]?.workoutInstanceId ?? null);
      setDay(null);
      setOpenPlanId(null);
    }
  }, [visible, recent]);

  const programs = plans.data.filter((p) => p.days.some((d) => !d.isRestDay && (d.workout?.workoutExercises?.length ?? 0) > 0));

  const start = async () => {
    let name = 'Workout';
    let exerciseIds: number[] = [];
    if (source === 'repeat') {
      const s = recent.find((r) => r.workoutInstanceId === sessionId);
      if (!s) return;
      name = s.workoutName;
      exerciseIds = sessionExerciseIds(s);
    } else if (source === 'program') {
      const plan = plans.data.find((p) => p.id === day?.planId);
      const d = plan?.days.find((x) => x.id === day?.dayId);
      if (!plan || !d) return;
      name = dayWorkoutName(plan, d);
      exerciseIds = [...(d.workout?.workoutExercises ?? [])].sort((a, b) => a.order - b.order).map((we) => we.exercise.id);
    }

    setStarting(true);
    try {
      const instance = await workoutService.createStandaloneWorkout(name);
      if (exerciseIds.length > 0) await workoutService.addExercise(instance.id, exerciseIds);
      onStarted(instance.id);
    } catch (err) {
      Alert.alert("Couldn't start the workout", err instanceof Error ? err.message : 'Try again.');
    } finally {
      setStarting(false);
    }
  };

  const canStart =
    source === 'empty' || (source === 'repeat' && sessionId != null) || (source === 'program' && day != null);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Log something off-plan"
      subtitle="Counts toward your data, not your cycle's adherence"
      footer={<Button label="Start workout" onPress={start} disabled={!canStart} loading={starting} full />}
    >
      {recent.length > 0 ? (
        <OptionCard
          title="Repeat a past session"
          description="Same exercises, last time's numbers prefilled"
          selected={source === 'repeat'}
          onPress={() => setSource('repeat')}
        >
          {source === 'repeat' ? (
            <View>
              {recent.map((s, i) => {
                const selected = s.workoutInstanceId === sessionId;
                return (
                  <Pressable
                    key={s.workoutInstanceId}
                    onPress={() => setSessionId(s.workoutInstanceId)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.subRow, i > 0 && styles.divider]}
                  >
                    <View style={styles.subText}>
                      <Text style={styles.subTitle}>{s.workoutName}</Text>
                      <Text style={styles.subMeta}>{sessionMeta(s)}</Text>
                    </View>
                    {selected ? <CheckCircleGlyph size={18} /> : <View style={styles.checkSpace} />}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </OptionCard>
      ) : null}

      <OptionCard
        title="Pick a day from a program"
        description="Any day from any program you've built"
        selected={source === 'program'}
        onPress={() => setSource('program')}
      >
        {source === 'program' ? (
          programs.length === 0 ? (
            <Text style={styles.subMeta}>{plans.loading ? 'Loading programs…' : 'No programs with exercises yet.'}</Text>
          ) : (
            <View>
              {programs.map((plan, pi) => {
                const open = openPlanId === plan.id;
                return (
                  <View key={plan.id} style={pi > 0 && styles.divider}>
                    <Pressable
                      onPress={() => setOpenPlanId(open ? null : plan.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: open }}
                      style={styles.subRow}
                    >
                      <Text style={[styles.subTitle, styles.flex]}>{plan.name}</Text>
                      <ChevronGlyph direction={open ? 'down' : 'right'} />
                    </Pressable>
                    {open
                      ? plan.days
                          .filter((d) => !d.isRestDay && (d.workout?.workoutExercises?.length ?? 0) > 0)
                          .map((d) => {
                            const selected = day?.planId === plan.id && day.dayId === d.id;
                            return (
                              <Pressable
                                key={d.id}
                                onPress={() => setDay({ planId: plan.id, dayId: d.id })}
                                accessibilityRole="radio"
                                accessibilityState={{ selected }}
                                style={[styles.subRow, styles.indent]}
                              >
                                <View style={styles.subText}>
                                  <Text style={styles.subTitle}>{dayLabel(d)}</Text>
                                  <Text style={styles.subMeta}>
                                    {d.workout?.workoutExercises.length} exercises
                                  </Text>
                                </View>
                                {selected ? <CheckCircleGlyph size={18} /> : <View style={styles.checkSpace} />}
                              </Pressable>
                            );
                          })
                      : null}
                  </View>
                );
              })}
            </View>
          )
        ) : null}
      </OptionCard>

      <OptionCard
        title="Start empty"
        description="Add exercises as you go"
        selected={source === 'empty'}
        onPress={() => setSource('empty')}
      />
    </Sheet>
  );
};

const styles = StyleSheet.create({
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    minHeight: 44,
  },
  indent: {
    paddingLeft: 12,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
  },
  subText: {
    flex: 1,
    gap: 2,
  },
  flex: {
    flex: 1,
  },
  subTitle: {
    ...type.bodyStrong,
    color: colors.text.primary,
  },
  subMeta: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  checkSpace: {
    width: 18,
  },
});
