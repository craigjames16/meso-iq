import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useExerciseLibrary, type LibraryExercise } from '../../hooks/useExerciseLibrary';
import { useTrainingHistory } from '../../hooks/useTrainingHistory';
import { usePlans } from '../../hooks/usePlans';
import { Card, ChevronGlyph, Chip, ErrorState, ListRow, SearchGlyph, Skeleton, TextField } from '../../components/ui';
import { colors, MUSCLES, muscleLabel, type, type MuscleKey } from '../../theme';
import { calendarDaysBetween, formatDaysAgo } from '../../utils/format';
import { matchesQuery } from '../../utils/search';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Sort = 'recent' | 'az';

export const ExercisesTab: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const library = useExerciseLibrary();
  const history = useTrainingHistory();
  const plans = usePlans();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleKey | 'ALL'>('ALL');
  const [sort, setSort] = useState<Sort>('recent');
  const [open, setOpen] = useState<{ never: boolean; unused: boolean }>({ never: false, unused: false });
  const { lastPerformed } = history.data;
  const today = new Date();

  const inProgram = useMemo(() => {
    const ids = new Set<number>();
    for (const p of plans.data) for (const d of p.days ?? []) for (const we of d.workout?.workoutExercises ?? []) ids.add(we.exercise.id);
    return ids;
  }, [plans.data]);

  const visible = useMemo(
    () => library.data.exercises.filter((e) => (filter === 'ALL' || e.muscle === filter) && matchesQuery(e.name, query)),
    [library.data.exercises, filter, query],
  );
  const performed = useMemo(() => {
    const list = visible.filter((e) => lastPerformed.has(e.id));
    return sort === 'recent'
      ? list.sort((a, b) => (lastPerformed.get(b.id)! > lastPerformed.get(a.id)! ? 1 : -1))
      : list.sort((a, b) => a.name.localeCompare(b.name));
  }, [visible, lastPerformed, sort]);
  const never = visible.filter((e) => !lastPerformed.has(e.id));
  const unused = visible.filter((e) => !inProgram.has(e.id));

  const meta = (e: LibraryExercise) => {
    const last = lastPerformed.get(e.id);
    return `${muscleLabel(e.category)} · ${last ? `last ${formatDaysAgo(calendarDaysBetween(last, today))}` : 'never'}`;
  };

  const rows = (list: LibraryExercise[]) =>
    list.map((e, i) => (
      <ListRow
        key={e.id}
        title={e.name}
        meta={meta(e)}
        chevron
        divider={i > 0}
        onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: e.id })}
      />
    ));

  if (library.error && library.data.exercises.length === 0) return <ErrorState onRetry={library.refresh} />;

  const allPerformed = library.data.exercises.filter((e) => lastPerformed.has(e.id)).length;

  return (
    <>
      <TextField
        placeholder={`Search ${library.data.exercises.length} exercises`}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        left={<SearchGlyph />}
        accessibilityLabel="Search exercises"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={filter === 'ALL'} onPress={() => setFilter('ALL')} />
        {MUSCLES.map((m) => (
          <Chip key={m} label={muscleLabel(m)} selected={filter === m} onPress={() => setFilter(m)} />
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        <Chip
          label={sort === 'recent' ? 'Recently used' : 'A–Z'}
          dropdown
          onPress={() => setSort((s) => (s === 'recent' ? 'az' : 'recent'))}
          accessibilityLabel={`Sort: ${sort === 'recent' ? 'recently used' : 'A to Z'}. Change sort`}
        />
        <Text style={styles.meta}>
          {allPerformed} performed · {library.data.exercises.length - allPerformed} never
        </Text>
      </View>

      {library.loading && library.data.exercises.length === 0 ? (
        <Skeleton height={300} />
      ) : (
        <>
          {performed.length > 0 ? <Card gap={0}>{rows(performed)}</Card> : null}
          {visible.length === 0 ? <Text style={styles.meta}>No exercises match.</Text> : null}
          {[
            { key: 'never' as const, label: `Never performed · ${never.length}`, list: never },
            { key: 'unused' as const, label: `Not in any program · ${unused.length}`, list: unused },
          ]
            .filter((g) => g.list.length > 0)
            .map((g) => (
              <Card key={g.key} variant="subtle" gap={0}>
                <Pressable
                  onPress={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open[g.key] }}
                  style={styles.groupHead}
                >
                  <Text style={styles.groupLabel}>{g.label}</Text>
                  <ChevronGlyph direction={open[g.key] ? 'down' : 'right'} />
                </Pressable>
                {open[g.key] ? rows(g.list) : null}
              </Card>
            ))}
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  chips: {
    gap: 6,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  meta: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  groupLabel: {
    ...type.bodyStrong,
    color: colors.text.secondary,
  },
});
