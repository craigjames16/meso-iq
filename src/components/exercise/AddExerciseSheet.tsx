import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, CheckGlyph, Chip, SearchGlyph, SectionLabel, Segmented, Sheet, TextField, WarningGlyph } from '../ui';
import { colors, MUSCLES, muscleLabel, radius, type, type MuscleKey } from '../../theme';
import { exercisesService } from '../../services/exercisesService';
import { invalidateExerciseLibrary, loadExerciseLibrary, useExerciseLibrary, type LibraryExercise } from '../../hooks/useExerciseLibrary';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import { calendarDaysBetween, formatDaysAgo } from '../../utils/format';
import { matchesQuery, nearDuplicates } from '../../utils/search';

type Mode = 'browse' | 'create';

interface AddExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Context line, for example "Legs · Week 1 · Day 5" or the builder day name. */
  subtitle?: string;
  /** Adds the chosen exercises. The sheet stays open if this throws. */
  onAdd: (exercises: LibraryExercise[]) => Promise<void> | void;
  /** Exercises already in the workout or day; shown as added and not selectable. */
  excludeIds?: number[];
}

const RECENT_LIMIT = 8;
const SEARCH_DEBOUNCE_MS = 200;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const SelectBox: React.FC<{ selected: boolean; disabled?: boolean }> = ({ selected, disabled }) => (
  <View style={[styles.box, selected && styles.boxSelected, disabled && styles.boxDisabled]}>
    {selected ? <CheckGlyph size={14} color={colors.action.onFill} /> : null}
  </View>
);

export const AddExerciseSheet: React.FC<AddExerciseSheetProps> = ({ visible, onClose, subtitle, onAdd, excludeIds = [] }) => {
  const library = useExerciseLibrary();
  const history = useTrainingHistory();
  const [mode, setMode] = useState<Mode>('browse');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleKey | 'ALL'>('ALL');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleKey | null>(null);
  const [busy, setBusy] = useState(false);
  const debouncedName = useDebounced(name, SEARCH_DEBOUNCE_MS);
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  useEffect(() => {
    if (!visible) {
      setMode('browse');
      setQuery('');
      setFilter('ALL');
      setSelected(new Set());
      setName('');
      setMuscle(null);
    }
  }, [visible]);

  const { lastPerformed, sessionCounts } = history.data;
  const today = new Date();

  const { recent, rest } = useMemo(() => {
    const visibleExercises = library.data.exercises.filter(
      (e) => (filter === 'ALL' || e.muscle === filter) && matchesQuery(e.name, query),
    );
    const performed = visibleExercises
      .filter((e) => lastPerformed.has(e.id))
      .sort((a, b) => (lastPerformed.get(b.id)! > lastPerformed.get(a.id)! ? 1 : -1))
      .slice(0, RECENT_LIMIT);
    const recentIds = new Set(performed.map((e) => e.id));
    return { recent: performed, rest: visibleExercises.filter((e) => !recentIds.has(e.id)) };
  }, [library.data.exercises, filter, query, lastPerformed]);

  const duplicates = useMemo(
    () => (mode === 'create' ? nearDuplicates(debouncedName, library.data.exercises) : []),
    [mode, debouncedName, library.data.exercises],
  );

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = async (exercises: LibraryExercise[]) => {
    if (exercises.length === 0) return;
    setBusy(true);
    try {
      await onAdd(exercises);
    } catch (err) {
      Alert.alert("Couldn't add", err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!name.trim() || !muscle) return;
    setBusy(true);
    try {
      const created = await exercisesService.createExercise({ name: name.trim(), category: muscle });
      invalidateExerciseLibrary();
      const list = await loadExerciseLibrary(true);
      const entry = list.find((e) => e.id === created.id) ?? {
        id: created.id,
        name: created.name,
        category: muscle,
        muscle,
        custom: true,
      };
      setBusy(false);
      await add([entry]);
    } catch (err) {
      setBusy(false);
      Alert.alert("Couldn't create the exercise", err instanceof Error ? err.message : 'Try again.');
    }
  };

  const meta = (e: LibraryExercise) => {
    const last = lastPerformed.get(e.id);
    const label = muscleLabel(e.category);
    return last ? `${label} · ${formatDaysAgo(calendarDaysBetween(last, today))}` : label;
  };

  const renderRow = (e: LibraryExercise, i: number) => {
    const already = excluded.has(e.id);
    const isSelected = selected.has(e.id);
    return (
      <Pressable
        key={e.id}
        onPress={() => toggle(e.id)}
        disabled={already}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected || already, disabled: already }}
        style={[styles.row, i > 0 && styles.rowDivider]}
      >
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, already && styles.rowTitleMuted]} numberOfLines={1}>
            {e.name}
          </Text>
          <Text style={styles.rowMeta}>{already ? `${meta(e)} · added` : meta(e)}</Text>
        </View>
        <SelectBox selected={isSelected || already} disabled={already} />
      </Pressable>
    );
  };

  const count = selected.size;
  const footer =
    mode === 'browse' ? (
      <Button
        label={count === 0 ? 'Add exercises' : `Add ${count} ${count === 1 ? 'exercise' : 'exercises'}`}
        onPress={() => add(library.data.exercises.filter((e) => selected.has(e.id)))}
        disabled={count === 0}
        loading={busy}
        full
      />
    ) : (
      <Button label="Create & add" onPress={create} disabled={!name.trim() || !muscle} loading={busy} full />
    );

  return (
    <Sheet visible={visible} onClose={onClose} title="Add exercise" subtitle={subtitle} footer={footer} height={0.88}>
      <Segmented
        options={[
          { value: 'browse', label: 'Browse' },
          { value: 'create', label: 'Create' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'browse' ? (
        <>
          <TextField
            placeholder={`Search ${library.data.exercises.length} exercises`}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            left={<SearchGlyph />}
            accessibilityLabel="Search exercises"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All" selected={filter === 'ALL'} onPress={() => setFilter('ALL')} />
            {MUSCLES.map((m) => (
              <Chip key={m} label={muscleLabel(m)} selected={filter === m} onPress={() => setFilter(m)} />
            ))}
          </ScrollView>
          {library.loading && library.data.exercises.length === 0 ? (
            <Text style={styles.empty}>Loading exercises…</Text>
          ) : recent.length + rest.length === 0 ? (
            <Text style={styles.empty}>No exercises match. Try Create.</Text>
          ) : null}
          {recent.length > 0 ? (
            <View style={styles.group}>
              <SectionLabel>RECENTLY USED</SectionLabel>
              <View>{recent.map(renderRow)}</View>
            </View>
          ) : null}
          {rest.length > 0 ? (
            <View style={styles.group}>
              <SectionLabel>{recent.length > 0 ? 'A–Z' : 'ALL EXERCISES'}</SectionLabel>
              <View>{rest.map(renderRow)}</View>
            </View>
          ) : null}
        </>
      ) : (
        <>
          <TextField label="NAME" placeholder="Bent over rows" value={name} onChangeText={setName} autoCapitalize="words" />
          {duplicates.length > 0 ? (
            <Card variant="warning" padding={14} gap={6}>
              <View style={styles.dupHeader}>
                <WarningGlyph size={14} />
                <Text style={styles.dupLabel}>ALREADY IN YOUR LIBRARY</Text>
              </View>
              {duplicates.map((d, i) => {
                const n = sessionCounts.get(d.id) ?? 0;
                return (
                  <View key={d.id} style={[styles.dupRow, i > 0 && styles.rowDivider]}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>{d.name}</Text>
                      <Text style={styles.rowMeta}>
                        {muscleLabel(d.category)} · {n > 0 ? `${n} ${n === 1 ? 'session' : 'sessions'}` : 'never performed'}
                      </Text>
                    </View>
                    <Button
                      label={excluded.has(d.id) ? 'Added' : 'Use'}
                      variant="secondary"
                      size="small"
                      disabled={excluded.has(d.id) || busy}
                      onPress={() => add([d])}
                    />
                  </View>
                );
              })}
            </Card>
          ) : null}
          <View style={styles.group}>
            <SectionLabel>MUSCLE GROUP</SectionLabel>
            <View style={styles.wrap}>
              {MUSCLES.map((m) => (
                <Chip key={m} label={muscleLabel(m)} selected={muscle === m} onPress={() => setMuscle(m)} />
              ))}
            </View>
          </View>
        </>
      )}
    </Sheet>
  );
};

const styles = StyleSheet.create({
  chips: {
    gap: 6,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  group: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    minHeight: 44,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    ...type.bodyStrong,
    color: colors.text.primary,
  },
  rowTitleMuted: {
    color: colors.text.faint,
  },
  rowMeta: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.badge,
    borderWidth: 1.5,
    borderColor: colors.border.stronger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxSelected: {
    backgroundColor: colors.action.fill,
    borderColor: colors.action.fill,
  },
  boxDisabled: {
    opacity: 0.4,
  },
  empty: {
    ...type.meta,
    color: colors.text.secondary,
  },
  dupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dupLabel: {
    ...type.label,
    color: colors.warning.base,
  },
  dupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
});
