import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Chip, OptionCard, Sheet, TextField } from '../ui';
import { colors, type } from '../../theme';
import { plansService } from '../../services/plansService';
import { invalidatePlans } from '../../hooks/usePlans';

type Mode = 'build' | 'describe';

interface NewProgramSheetProps {
  visible: boolean;
  onClose: () => void;
  onBuild: () => void;
  onDrafted: (planId: number) => void;
}

const PLACEHOLDER = '4 days a week, upper/lower. Prioritise back and arms. Commercial gym, machines are fine.';

const STARTERS: { label: string; text: string }[] = [
  { label: 'Upper / Lower', text: '4 days a week, upper/lower split.' },
  { label: 'Push / Pull / Legs', text: '6 days a week, push/pull/legs twice through.' },
  { label: 'Full body 3×', text: '3 full-body days a week.' },
  { label: 'Arm priority', text: 'Prioritise biceps and triceps.' },
];

export const NewProgramSheet: React.FC<NewProgramSheetProps> = ({ visible, onClose, onBuild, onDrafted }) => {
  const [mode, setMode] = useState<Mode>('build');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMode('build');
      setPrompt('');
    }
  }, [visible]);

  const addStarter = (text: string) => setPrompt((p) => (p.trim() ? `${p.trim()} ${text}` : text));

  const draft = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const plan = await plansService.createPlanWithAI(prompt.trim());
      invalidatePlans();
      onDrafted(plan.id);
    } catch (err) {
      Alert.alert("Couldn't draft the program", err instanceof Error ? err.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="New program"
      footer={
        mode === 'build' ? (
          <Button label="Start building" onPress={onBuild} full />
        ) : (
          <View style={styles.footer}>
            <Button label="Draft my program" onPress={draft} disabled={!prompt.trim()} loading={busy} full />
            <Text style={styles.caption}>The draft is saved as a program. Change anything before you start a cycle.</Text>
          </View>
        )
      }
    >
      <OptionCard
        title="Build it yourself"
        description="Add days and exercises by hand"
        selected={mode === 'build'}
        onPress={() => setMode('build')}
      />
      <OptionCard
        title="Describe it"
        description="Get a draft, then edit it in the builder"
        selected={mode === 'describe'}
        onPress={() => setMode('describe')}
      >
        {mode === 'describe' ? (
          <View style={styles.describe}>
            <TextField
              value={prompt}
              onChangeText={setPrompt}
              placeholder={PLACEHOLDER}
              multiline
              accessibilityLabel="Describe your program"
            />
            <View style={styles.chips}>
              {STARTERS.map((s) => (
                <Chip key={s.label} label={s.label} onPress={() => addStarter(s.text)} />
              ))}
            </View>
          </View>
        ) : null}
      </OptionCard>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  describe: {
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  footer: {
    gap: 8,
  },
  caption: {
    ...type.metaSmall,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
