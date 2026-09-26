import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, SectionLabel, Sheet, TextField } from '../ui';
import { colors, MUSCLES, muscleLabel, type, type MuscleKey } from '../../theme';
import { dashboardService } from '../../services/dashboardService';
import { invalidateExerciseLibrary } from '../../hooks/useExerciseLibrary';
import { invalidateExerciseHistory } from '../../hooks/exerciseSessions';
import { invalidatePlans } from '../../hooks/usePlans';

interface EditExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  exercise: { id: number; name: string; category: string } | null;
  programCount: number;
  sessionCount: number;
  onSaved: () => void;
  onDeleted: () => void;
}

export const EditExerciseSheet: React.FC<EditExerciseSheetProps> = ({
  visible,
  onClose,
  exercise,
  programCount,
  sessionCount,
  onSaved,
  onDeleted,
}) => {
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleKey | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible && exercise) {
      setName(exercise.name);
      setMuscle((exercise.category?.toUpperCase() as MuscleKey) ?? null);
    }
  }, [visible, exercise]);

  const invalidate = () => {
    invalidateExerciseLibrary();
    invalidateExerciseHistory(exercise?.id);
    invalidatePlans();
  };

  const save = async () => {
    if (!exercise || !name.trim() || !muscle) return;
    setBusy(true);
    try {
      await dashboardService.updateExercise(exercise.id, { name: name.trim(), category: muscle });
      invalidate();
      onSaved();
    } catch (err) {
      Alert.alert("Couldn't save the exercise", err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!exercise) return;
    Alert.alert(
      `Delete ${exercise.name}?`,
      `It's used in ${programCount} ${programCount === 1 ? 'program' : 'programs'} and ${sessionCount} logged ${sessionCount === 1 ? 'session' : 'sessions'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dashboardService.deleteExercise(exercise.id);
              invalidate();
              onDeleted();
            } catch (err) {
              Alert.alert("Couldn't delete the exercise", err instanceof Error ? err.message : 'Try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Edit exercise"
      footer={
        <View style={styles.footer}>
          <Button label="Save changes" onPress={save} disabled={!name.trim() || !muscle} loading={busy} full />
          <Button label="Delete exercise" variant="danger" onPress={remove} full />
        </View>
      }
    >
      <TextField label="NAME" value={name} onChangeText={setName} autoCapitalize="words" />
      <View style={styles.group}>
        <SectionLabel>MUSCLE GROUP</SectionLabel>
        <View style={styles.wrap}>
          {MUSCLES.map((m) => (
            <Chip key={m} label={muscleLabel(m)} selected={muscle === m} onPress={() => setMuscle(m)} />
          ))}
        </View>
      </View>
      <Text style={styles.impact}>
        Used in {programCount} {programCount === 1 ? 'program' : 'programs'} and {sessionCount} logged{' '}
        {sessionCount === 1 ? 'session' : 'sessions'}. A rename or new muscle group applies everywhere, including past sessions and charts.
      </Text>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  group: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  impact: { ...type.meta, lineHeight: 18, color: colors.text.muted },
  footer: { gap: 4 },
});
