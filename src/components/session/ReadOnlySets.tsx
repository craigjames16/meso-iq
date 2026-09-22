import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, tabularNums, type, size } from '../../theme';
import type { SetRecord } from '../../analytics';
import { badgeLabel } from '../logger/setOps';
import type { AttachedSetType, ClientSetType } from '../logger/types';

interface ReadOnlySetsProps {
  sets: SetRecord[];
  /** Sets to highlight in data orange, for example the top set. */
  highlight?: (set: SetRecord) => boolean;
}

function sortSets(sets: SetRecord[]): SetRecord[] {
  return [...sets].sort((a, b) => a.setNumber - b.setNumber || (a.subSetNumber ?? 0) - (b.subSetNumber ?? 0));
}

/** Logged sets as read-only rows: badge and "140 × 12", attached sets indented. */
export const ReadOnlySets: React.FC<ReadOnlySetsProps> = ({ sets, highlight }) => {
  let parentType: ClientSetType | undefined;
  return (
    <View style={styles.list}>
      {sortSets(sets).map((s, i) => {
        const attached = s.subSetNumber != null;
        if (!attached) parentType = s.setType;
        const technique = attached
          ? ((s.setType && s.setType !== 'REGULAR' ? s.setType : parentType && parentType !== 'REGULAR' ? parentType : 'DROP_SET') as AttachedSetType)
          : undefined;
        const tech = technique ? colors.technique[technique] : null;
        const hi = highlight?.(s) ?? false;
        return (
          <View
            key={`${s.setNumber}-${s.subSetNumber ?? 0}-${i}`}
            style={[styles.row, attached && styles.attached, { borderLeftColor: tech ? tech.fg : colors.success.base }, attached ? styles.railAttached : styles.railMain]}
          >
            <View style={[styles.badge, tech ? { backgroundColor: tech.tagBg, borderColor: tech.tagBg } : null]}>
              <Text style={[styles.badgeText, tech ? { color: tech.fg } : null]}>
                {badgeLabel({ ...s, weight: s.weight, reps: s.reps }, parentType)}
              </Text>
            </View>
            <Text style={[styles.value, hi && styles.valueHighlight]}>
              {s.weight}
              <Text style={styles.times}> × </Text>
              {s.reps}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.field,
    backgroundColor: colors.success.rowBg,
  },
  railMain: {
    borderLeftWidth: 3,
  },
  railAttached: {
    borderLeftWidth: 2,
  },
  attached: {
    marginLeft: 16,
  },
  badge: {
    minWidth: 22,
    minHeight: 22,
    paddingHorizontal: 2,
    borderRadius: radius.badge,
    borderWidth: 1,
    backgroundColor: colors.success.badgeBg,
    borderColor: colors.success.fieldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...type.tag,
    color: colors.success.badgeText,
    ...tabularNums,
  },
  value: {
    flex: 1,
    ...type.setField,
    fontSize: size.field,
    color: colors.success.fieldText,
  },
  valueHighlight: {
    color: colors.data.main,
  },
  times: {
    color: colors.success.lastText,
  },
});
