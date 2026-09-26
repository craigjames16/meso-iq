import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AvatarButton,
  Button,
  Card,
  CardTitle,
  Chip,
  DeltaText,
  DetailHeader,
  EmptyState,
  ErrorState,
  IconButton,
  ListRow,
  MenuAction,
  MenuGroup,
  MoreGlyph,
  NotEnough,
  OptionCard,
  PlusGlyph,
  Screen,
  ScreenHeader,
  SectionLabel,
  Segmented,
  Sheet,
  Skeleton,
  StatRow,
  StatTile,
  Stepper,
  Tag,
  TextField,
} from '../../components/ui';
import { BarRow, HeatGrid, LineChart, LineKey, Matrix, ProfileBars, Radar, Sparkline, VerticalBars } from '../../components/charts';
import type { HeatCell, HeatLevel } from '../../components/charts';
import { colors, type } from '../../theme';

const DAY = 86400000;
const now = Date.now();
const e1rmSample = [168, 171, 170, 175, 178, 176, 182, 185, 184, 189, 192, 190, 196, 199, 197, 203, 208, 212].map(
  (y, i, arr) => ({ x: new Date(now - (arr.length - 1 - i) * 7 * DAY), y, isPR: i === 15 || i === 17 }),
);

const heatWeeks: HeatCell[][] = Array.from({ length: 26 }, (_, w) =>
  Array.from({ length: 7 }, (__, d) => ({
    date: new Date(now - ((25 - w) * 7 + (6 - d)) * DAY),
    level: ([0, 2, 0, 3, 1, 0, 2][(w + d) % 7] as HeatLevel),
  })),
);

const BarRowSample: React.FC = () => (
  <View style={styles.bars}>
    {[
      { label: 'BACK', value: 18, tick: 16, delta: '+2', color: colors.success.pillText },
      { label: 'CHEST', value: 14, tick: 14, delta: '—', color: colors.text.muted },
      { label: 'SHOULDERS', value: 6, tick: 8, delta: '−2', color: colors.danger.base },
    ].map((b) => (
      <BarRow
        key={b.label}
        label={b.label}
        value={b.value}
        max={20}
        tick={b.tick}
        delta={{ label: b.delta, color: b.color }}
        labelWidth={72}
        onPress={() => {}}
      />
    ))}
    <BarRow label="CHEST" value={0.012} min={-0.01} max={0.02} valueLabel="+1.2%" labelWidth={72} height={12} />
    <BarRow label="CALVES" value={-0.004} min={-0.01} max={0.02} valueLabel="−0.4%" color={colors.data.reference} labelWidth={72} height={12} />
  </View>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <SectionLabel>{title}</SectionLabel>
    {children}
  </View>
);

export const StyleGuideScreen: React.FC = () => {
  const navigation = useNavigation();
  const [segment, setSegment] = useState<'cycle' | 'progress' | 'history'>('cycle');
  const [chip, setChip] = useState('All');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [option, setOption] = useState('straight');
  const [weeks, setWeeks] = useState(5);

  return (
    <Screen bottom="none">
      <DetailHeader title="Style guide" meta="Every primitive and chart, with sample data" onBack={() => navigation.goBack()} />

      <Section title="Headers">
        <ScreenHeader
          title="Today"
          subtitle="Thursday, Sep 17"
          right={<AvatarButton initial="C" onPress={() => {}} />}
        />
        <DetailHeader title="Meso 3" meta="PPL/Upper/Lower · started Aug 24" onBack={() => {}} action={{ label: 'Edit', onPress: () => {} }} titleAccessory={<Tag label="RUNNING" tone="success" />} />
      </Section>

      <Section title="Buttons">
        <Button label="Start workout" onPress={() => {}} full />
        <Button label="Adjust cycle" variant="secondary" onPress={() => {}} full />
        <Button label="Log something off-plan" variant="dashed" icon={<PlusGlyph />} onPress={() => {}} full />
        <Button label="Delete" variant="danger" onPress={() => {}} />
        <Button label="Ghost" variant="ghost" onPress={() => {}} />
        <Button label="Loading" loading onPress={() => {}} full />
        <Button label="Disabled" disabled onPress={() => {}} full />
        <View style={styles.row}>
          <IconButton icon={<MoreGlyph />} onPress={() => {}} accessibilityLabel="More" />
          <IconButton icon={<PlusGlyph color={colors.text.body} />} onPress={() => {}} accessibilityLabel="Add" size={34} />
          <AvatarButton initial="C" onPress={() => {}} />
        </View>
      </Section>

      <Section title="Chips and segments">
        <View style={styles.wrap}>
          {['All', 'Chest', 'Back', 'Quads'].map((c) => (
            <Chip key={c} label={c} selected={chip === c} onPress={() => setChip(c)} />
          ))}
          <Chip label="Mesocycle 3" dropdown onPress={() => {}} />
        </View>
        <Segmented
          options={[
            { value: 'cycle', label: 'Cycle' },
            { value: 'progress', label: 'Progress' },
            { value: 'history', label: 'History' },
          ]}
          value={segment}
          onChange={setSegment}
        />
        <Stepper label="Weeks" value={weeks} min={3} max={8} onChange={setWeeks} />
      </Section>

      <Section title="Tags and deltas">
        <View style={styles.wrap}>
          {(['neutral', 'success', 'warning', 'danger', 'drop', 'restPause', 'myo', 'data'] as const).map((t) => (
            <Tag key={t} label={t.toUpperCase()} tone={t} />
          ))}
        </View>
        <View style={styles.row}>
          <DeltaText value={0.031} />
          <DeltaText value={-0.018} />
          <DeltaText value={0.002} />
        </View>
      </Section>

      <Section title="Cards">
        <Card variant="hero">
          <Text style={styles.heroTitle}>Push</Text>
          <Text style={styles.meta}>Hero card, padding 16</Text>
        </Card>
        <Card>
          <CardTitle title="Recent" action={{ label: 'All workouts', onPress: () => {} }} />
          <ListRow title="Day 2 · Pull" meta="Wed 16 · 14 sets · 8,760 lb" value="8,760" delta={0.022} onPress={() => {}} />
          <ListRow title="Day 1 · Upper" meta="Mon 14 · 13 sets · 8,214 lb" value="8,214" delta={-0.018} divider onPress={() => {}} />
          <ListRow title="Leg Press" meta="Quads · last 3 days ago" chevron divider onPress={() => {}} />
        </Card>
        <Card variant="subtle">
          <Text style={styles.meta}>Subtle card</Text>
        </Card>
        <Card variant="warning">
          <Text style={styles.meta}>Warning card</Text>
        </Card>
        <StatRow>
          <StatTile label="Sets" value="14" />
          <StatTile label="lb lifted" value="8,760" delta={0.031} deltaSuffix="vs last" />
        </StatRow>
        <StatRow>
          <StatTile label="Adherence" value="87%" />
          <StatTile label="Avg e1RM" value="" empty />
        </StatRow>
      </Section>

      <Section title="Fields">
        <TextField label="Name" placeholder="Meso 4" />
        <TextField label="Password" placeholder="At least 8 characters" secureTextEntry accessory={{ label: 'Show', onPress: () => {} }} />
        <TextField label="Email" error="Enter a valid email" defaultValue="craig@" />
      </Section>

      <Section title="States">
        <EmptyState message="Start a cycle to see how it's going" action={{ label: 'Go to Plan', onPress: () => {} }} />
        <ErrorState />
        <NotEnough />
        <Skeleton height={80} />
      </Section>

      <Section title="Sheet">
        <Button label="Open sheet" variant="secondary" onPress={() => setSheetOpen(true)} full />
      </Section>

      <Section title="Charts">
        <Card>
          <CardTitle title="Working sets this week" subtitle="Sets, not volume, comparable across muscles" info="hardSets" />
          <BarRowSample />
        </Card>
        <Card>
          <CardTitle title="Est. 1RM" subtitle="LineChart with trend and PR rings" info="e1rm" />
          <LineChart
            points={e1rmSample}
            trend={{ slope: (212 - 168) / (17 * 7 * DAY), intercept: 168 }}
            xLabels={[
              { x: e1rmSample[0].x, label: 'MAY' },
              { x: e1rmSample[17].x, label: 'SEP' },
            ]}
          />
          <LineKey
            items={[
              { kind: 'line', label: 'Trend', color: colors.data.reference, dashed: true },
              { kind: 'ring', label: 'Personal record', color: colors.data.main },
            ]}
          />
        </Card>
        <Card>
          <CardTitle title="Strength trend" info="strengthTrend" />
          <ListRow title="Machine Chest Press" right={<Sparkline values={[180, 186, 191, 200, 212]} />} value="212" delta={0.073} />
        </Card>
        <Card>
          <CardTitle title="Volume per month" subtitle="VerticalBars with a dashed average" info="tonnage" />
          <VerticalBars
            bars={['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'].map((label, i) => ({
              label,
              value: [168, 182, 176, 201, 214, 198, 232, 241, 118][i] * 1000,
              partial: i === 8,
              highlight: i === 7,
              showLabel: i % 3 === 0 || i === 8,
            }))}
            average={[null, null, 175, 186, 197, 204, 215, 224, null].map((v) => (v == null ? null : v * 1000))}
            formatY={(v) => (v === 0 ? '0' : `${Math.round(v / 1000)}k`)}
          />
        </Card>
        <Card>
          <CardTitle title="Consistency" subtitle="HeatGrid, 26 weeks" info="consistency" />
          <HeatGrid weeks={heatWeeks} />
        </Card>
        <Card>
          <CardTitle title="Where you actually train" subtitle="Matrix" info="weightRepMatrix" />
          <Matrix
            rows={['225', '205', '185', '165']}
            cols={['≤4', '5–6', '7–8', '9–10', '11–12', '13+']}
            cells={[
              [1, 1, 0, 0, 0, 0],
              [0, 2, 1, 0, 0, 0],
              [0, 1, 3, 4, 2, 0],
              [0, 0, 1, 2, 3, 1],
            ]}
            counts={[
              [1, 1, 0, 0, 0, 0],
              [0, 3, 2, 0, 0, 0],
              [0, 2, 6, 9, 4, 0],
              [0, 0, 1, 4, 6, 2],
            ]}
          />
        </Card>
        <Card>
          <CardTitle title="This cycle vs. last" subtitle="Radar" info="cycleRadar" />
          <Radar
            axes={['CHEST', 'TRICEPS', 'BICEPS', 'HAMS', 'QUADS', 'BACK']}
            current={[0.7, 0.55, 0.45, 0.4, 0.75, 0.85]}
            previous={[0.55, 0.6, 0.4, 0.35, 0.65, 0.7]}
          />
        </Card>
        <Card>
          <CardTitle title="Starting sets per muscle" subtitle="ProfileBars" info="volumeProfile" />
          <ProfileBars
            bars={[
              { label: 'CHT', value: 8 },
              { label: 'BCK', value: 10 },
              { label: 'SHO', value: 2, warn: true },
              { label: 'QDS', value: 6 },
              { label: 'HAM', value: 4 },
              { label: 'BIC', value: 4 },
              { label: 'TRI', value: 4 },
              { label: 'CLF', value: 3, warn: true },
            ]}
          />
        </Card>
      </Section>

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Set 2"
        subtitle="Seated Leg Curls · 130 × 14"
        footer={<Button label="Done" onPress={() => setSheetOpen(false)} full />}
      >
        <SectionLabel>SET TYPE</SectionLabel>
        <OptionCard
          title="Straight set"
          description="one set, nothing attached"
          selected={option === 'straight'}
          onPress={() => setOption('straight')}
          left={<Tag label="—" />}
        />
        <OptionCard
          title="Drop set"
          description="weight comes down, no rest between drops"
          selected={option === 'drop'}
          onPress={() => setOption('drop')}
          left={<Tag label="D1" tone="drop" />}
          selectedColors={{
            bg: colors.technique.DROP_SET.selectedBg,
            border: colors.technique.DROP_SET.selectedBorder,
            check: colors.technique.DROP_SET.fg,
          }}
        />
        <MenuGroup>
          <MenuAction label="Duplicate set" onPress={() => {}} />
          <MenuAction label="Insert set below" onPress={() => {}} />
          <MenuAction label="Delete set" destructive onPress={() => {}} />
        </MenuGroup>
      </Sheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  bars: {
    gap: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroTitle: {
    ...type.heroTitle,
    color: colors.text.primary,
  },
  meta: {
    ...type.meta,
    color: colors.text.muted,
  },
});
