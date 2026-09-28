import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { MenuAction, MenuGroup, OptionCard, SectionLabel, Sheet, Tag } from '../ui';
import type { TagTone } from '../ui';
import { colors } from '../../theme';
import { features } from '../../config/features';
import type { ClientSetType } from './types';

interface SetMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Runs once the sheet is gone, for an action that presents something else. */
  onClosed?: () => void;
  title: string;
  subtitle?: string;
  /** Attached rows show only the actions, not the set types. */
  attached: boolean;
  currentType: ClientSetType;
  onChooseType: (type: ClientSetType) => void;
  onDuplicate: () => void;
  onInsertBelow: () => void;
  onDelete: () => void;
}

const TYPE_OPTIONS: {
  type: ClientSetType;
  name: string;
  description: string;
  tag: string;
  tone: TagTone;
  flag?: keyof typeof features;
}[] = [
  { type: 'REGULAR', name: 'Straight set', description: 'one set, nothing attached', tag: '—', tone: 'neutral' },
  { type: 'DROP_SET', name: 'Drop set', description: 'weight comes down, no rest between drops', tag: 'D1', tone: 'drop' },
  {
    type: 'REST_PAUSE',
    name: 'Rest-pause',
    description: 'same weight, short rest between bursts',
    tag: '+1',
    tone: 'restPause',
    flag: 'REST_PAUSE_SETS',
  },
  { type: 'MYO_REP', name: 'Myo-reps', description: 'same weight, a few breaths, small rep target', tag: 'M1', tone: 'myo' },
];

const iconColor = colors.text.secondary;

const DuplicateIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Rect x={6} y={6} width={9} height={9} rx={2} stroke={iconColor} strokeWidth={1.5} />
    <Path d="M12 6V4.5A1.5 1.5 0 0 0 10.5 3h-6A1.5 1.5 0 0 0 3 4.5v6A1.5 1.5 0 0 0 4.5 12H6" stroke={iconColor} strokeWidth={1.5} />
  </Svg>
);

const InsertIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M3 5h12M3 9h7M13.5 9v6M10.5 12h6" stroke={iconColor} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const DeleteIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M3.5 5h11M7.5 5V3.5h3V5M5 5l.7 9.3a1 1 0 0 0 1 .7h4.6a1 1 0 0 0 1-.7L13 5"
      stroke={colors.danger.base}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const SetMenuSheet: React.FC<SetMenuSheetProps> = ({
  visible,
  onClose,
  onClosed,
  title,
  subtitle,
  attached,
  currentType,
  onChooseType,
  onDuplicate,
  onInsertBelow,
  onDelete,
}) => {
  const options = TYPE_OPTIONS.filter((o) => !o.flag || features[o.flag] || o.type === currentType);
  return (
    <Sheet visible={visible} onClose={onClose} onClosed={onClosed} title={title} subtitle={subtitle}>
      {!attached ? (
        <View style={styles.types}>
          <SectionLabel>SET TYPE</SectionLabel>
          {options.map((o) => {
            const technique = o.type === 'REGULAR' ? null : colors.technique[o.type];
            return (
              <OptionCard
                key={o.type}
                title={o.name}
                description={o.description}
                selected={currentType === o.type}
                onPress={() => onChooseType(o.type)}
                left={
                  <View style={styles.tag}>
                    <Tag label={o.tag} tone={o.tone} />
                  </View>
                }
                selectedColors={
                  technique
                    ? { bg: technique.selectedBg, border: technique.selectedBorder, check: technique.fg }
                    : undefined
                }
              />
            );
          })}
        </View>
      ) : null}
      <MenuGroup>
        <MenuAction label="Duplicate set" icon={<DuplicateIcon />} onPress={onDuplicate} />
        <MenuAction label="Insert set below" icon={<InsertIcon />} onPress={onInsertBelow} />
        <MenuAction label="Delete set" icon={<DeleteIcon />} destructive onPress={onDelete} />
      </MenuGroup>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  types: {
    gap: 6,
  },
  tag: {
    width: 30,
    alignItems: 'center',
  },
});
