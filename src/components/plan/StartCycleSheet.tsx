import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, SectionLabel, Sheet, Stepper, TextField } from '../ui';
import { colors, radius, tabularNums, type } from '../../theme';
import { features } from '../../config/features';
import { mesocyclesService } from '../../services/mesocyclesService';
import { DEFAULT_CYCLE_WEEKS, MAX_CYCLE_WEEKS, MIN_CYCLE_WEEKS, addDays, mondayOf, nextMesocycleName, rirRamp } from '../../analytics';
import { invalidateMesocycles, loadMesocycles } from '../../hooks/mesocycleData';
import type { Plan } from '../../types/plan';
import { formatLongDay } from '../../utils/format';
import { planCounts } from './planText';

interface StartCycleSheetProps {
  visible: boolean;
  onClose: () => void;
  plan: Plan | null;
  onStarted: (mesocycleId: number) => void;
}

export const StartCycleSheet: React.FC<StartCycleSheetProps> = ({ visible, onClose, plan, onStarted }) => {
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState(DEFAULT_CYCLE_WEEKS);
  const [startNextMonday, setStartNextMonday] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setWeeks(DEFAULT_CYCLE_WEEKS);
    setStartNextMonday(false);
    loadMesocycles()
      .then((list) => setName(nextMesocycleName(list)))
      .catch(() => setName('Meso 1'));
  }, [visible]);

  const today = new Date();
  const nextMonday = addDays(mondayOf(today), 7);
  const startDate = startNextMonday ? nextMonday : today;
  const counts = plan ? planCounts(plan) : null;

  const start = async () => {
    if (!plan || !name.trim()) return;
    setBusy(true);
    try {
      const created = await mesocyclesService.createMesocycle({
        name: name.trim(),
        planId: String(plan.id),
        iterations: weeks,
        ...(features.CYCLE_START_OPTIONS ? { startDate: startDate.toISOString().slice(0, 10) } : {}),
      });
      invalidateMesocycles();
      onStarted(created.id);
    } catch (err) {
      Alert.alert("Couldn't start the cycle", err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Start a cycle"
      subtitle={plan && counts ? `From ${plan.name} · ${counts.training} training ${counts.training === 1 ? 'day' : 'days'} a week` : undefined}
      footer={<Button label="Start cycle" onPress={start} disabled={!name.trim() || !plan} loading={busy} full />}
    >
      <TextField label="NAME" value={name} onChangeText={setName} placeholder="Meso 1" />
      <View style={styles.weeksRow}>
        <View style={styles.flex}>
          <Text style={styles.weeksLabel}>Weeks</Text>
          <Text style={styles.caption}>The last week is the hardest, at RIR 0</Text>
        </View>
        <Stepper label="weeks" value={weeks} min={MIN_CYCLE_WEEKS} max={MAX_CYCLE_WEEKS} onChange={setWeeks} />
      </View>
      <View style={styles.section}>
        <SectionLabel>HOW EFFORT RAMPS</SectionLabel>
        <View style={styles.ramp}>
          {rirRamp(weeks).map((w) => (
            <View key={w.week} style={[styles.rampCell, w.rir === 0 && styles.rampPeak]}>
              <Text style={styles.rampWeek}>W{w.week}</Text>
              <Text style={styles.rampRir}>{w.deload ? 'Deload' : `RIR ${w.rir}`}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.caption}>Sets start at each exercise's week-1 count and rise from there.</Text>
      </View>
      {features.CYCLE_START_OPTIONS ? (
        <View style={styles.startsRow}>
          <View style={styles.flex}>
            <Text style={styles.weeksLabel}>Starts</Text>
            <Text style={styles.caption}>{formatLongDay(startDate)}</Text>
          </View>
          <Chip label="Today" selected={!startNextMonday} onPress={() => setStartNextMonday(false)} />
          <Chip label="Next Monday" selected={startNextMonday} onPress={() => setStartNextMonday(true)} />
        </View>
      ) : null}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 2,
  },
  weeksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weeksLabel: {
    ...type.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  caption: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  section: {
    gap: 8,
  },
  ramp: {
    flexDirection: 'row',
    gap: 4,
  },
  rampCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 9,
    borderRadius: radius.field,
    backgroundColor: colors.surface.inset,
  },
  rampPeak: {
    backgroundColor: colors.surface.field,
  },
  rampWeek: {
    ...type.caption,
    color: colors.text.muted,
    ...tabularNums,
  },
  rampRir: {
    ...type.metaSmall,
    fontWeight: '600',
    color: colors.text.primary,
    ...tabularNums,
  },
  startsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
