import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckGlyph, SearchGlyph, Sheet, TextField } from '../ui';
import { colors, muscleLabel, type } from '../../theme';
import { matchesQuery } from '../../utils/search';

export interface PickableExercise {
  id: number;
  name: string;
  muscle?: string;
  meta?: string;
}

interface ExercisePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  exercises: PickableExercise[];
  value: number | null;
  onChange: (id: number) => void;
  title?: string;
}

/** Searchable single-choice exercise list. */
export const ExercisePickerSheet: React.FC<ExercisePickerSheetProps> = ({
  visible,
  onClose,
  exercises,
  value,
  onChange,
  title = 'Choose an exercise',
}) => {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);
  const shown = useMemo(() => exercises.filter((e) => matchesQuery(e.name, query)), [exercises, query]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} height={0.8}>
      <TextField
        placeholder={`Search ${exercises.length} exercises`}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        left={<SearchGlyph />}
        accessibilityLabel="Search exercises"
      />
      <View>
        {shown.length === 0 ? <Text style={styles.meta}>No exercises match.</Text> : null}
        {shown.map((e, i) => {
          const selected = e.id === value;
          return (
            <Pressable
              key={e.id}
              onPress={() => {
                onChange(e.id);
                onClose();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.row, i > 0 && styles.divider]}
            >
              <View style={styles.text}>
                <Text style={styles.name}>{e.name}</Text>
                <Text style={styles.meta}>{[e.muscle ? muscleLabel(e.muscle) : null, e.meta].filter(Boolean).join(' · ')}</Text>
              </View>
              {selected ? <CheckGlyph color={colors.action.fill} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    minHeight: 44,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
  },
  text: {
    flex: 1,
    gap: 3,
  },
  name: {
    ...type.bodyStrong,
    color: colors.text.primary,
  },
  meta: {
    ...type.metaSmall,
    color: colors.text.muted,
  },
});
