import React from 'react';
import { Text, View } from 'react-native';
import ReactTestRenderer, { act, type ReactTestInstance } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GlassTabBar } from '../GlassTabBar';
import { glass } from '../../theme';
import { byLabel, flush, press } from '../../testing/render';

const Tabs = createBottomTabNavigator();
const Blank = (props: { route: { name: string } }) => (
  <View>
    <Text>{props.route.name} screen</Text>
  </View>
);
const RAIL_WIDTH = 360;

async function renderBar() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <NavigationContainer>
        <Tabs.Navigator
          screenOptions={{ headerShown: false }}
          tabBar={props => <GlassTabBar {...props} />}
        >
          <Tabs.Screen name="Track" component={Blank} />
          <Tabs.Screen name="Data" component={Blank} />
          <Tabs.Screen name="Plan" component={Blank} />
        </Tabs.Navigator>
      </NavigationContainer>,
    );
  });
  await flush();

  // The capsule is sized from the measured rail, so feed the rail a layout. It
  // is the innermost measured view that holds the tabs.
  const measured = renderer.root.findAll(
    n => typeof n.props.onLayout === 'function' && tabsOf(n).length > 0,
  );
  const rail = measured[measured.length - 1];
  await act(async () => {
    rail.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: RAIL_WIDTH, height: 46 } } });
  });
  return renderer;
}

/** The tab pressables, one per route. The role repeats down to the host view,
 * so match on the press handler to get one node per tab. */
function tabsOf(node: ReactTestInstance): ReactTestInstance[] {
  return node.findAll(
    n => n.props.accessibilityRole === 'tab' && typeof n.props.onPress === 'function',
  );
}

function selectedLabels(root: ReactTestInstance): string[] {
  return tabsOf(root)
    .filter(n => n.props.accessibilityState?.selected)
    .map(n => n.props.accessibilityLabel);
}

/** The selection capsule, found by the one fill only it uses. */
function capsuleStyle(root: ReactTestInstance): Record<string, unknown> {
  for (const node of root.findAll(n => n.props.pointerEvents === 'none')) {
    const flat = Object.assign({}, ...[node.props.style].flat(3).filter(Boolean));
    if (flat.backgroundColor === glass.selectedFill) {
      return flat;
    }
  }
  throw new Error('No selection capsule rendered');
}

describe('GlassTabBar', () => {
  it('labels every tab and marks exactly one selected', async () => {
    const r = await renderBar();
    for (const label of ['Track', 'Data', 'Plan']) {
      expect(byLabel(r.root, label)).toBeTruthy();
    }
    expect(selectedLabels(r.root)).toEqual(['Track']);
    await act(async () => r.unmount());
  });

  it('moves the selection when another tab is pressed', async () => {
    const r = await renderBar();
    await press(byLabel(r.root, 'Plan'));
    expect(selectedLabels(r.root)).toEqual(['Plan']);
    await act(async () => r.unmount());
  });

  it('sizes the selection capsule to one tab of the measured rail', async () => {
    const r = await renderBar();
    expect(capsuleStyle(r.root).width).toBeCloseTo(RAIL_WIDTH / 3);
    await act(async () => r.unmount());
  });
});
