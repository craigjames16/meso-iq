import React from 'react';
import ReactTestRenderer, { act, type ReactTestInstance, type ReactTestRenderer as Renderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScheduleProvider } from '../context/ScheduleContext';
import { WorkoutInstanceProvider } from '../context/WorkoutInstanceContext';

const Stack = createNativeStackNavigator<Record<string, object | undefined>>();

/** Mounts one screen inside the app's providers and a navigation stack. */
export async function renderScreen(
  name: string,
  component: React.ComponentType<any>,
  params?: object,
  extraScreens: Record<string, React.ComponentType<any>> = {},
): Promise<Renderer> {
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ScheduleProvider>
        <WorkoutInstanceProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name={name} component={component} initialParams={params} />
              {Object.entries(extraScreens).map(([n, c]) => (
                <Stack.Screen key={n} name={n} component={c} />
              ))}
            </Stack.Navigator>
          </NavigationContainer>
        </WorkoutInstanceProvider>
      </ScheduleProvider>,
    );
  });
  await flush();
  return renderer;
}

export async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise<void>((r) => setTimeout(() => r(), 0));
    });
  }
}

/** All text rendered on screen: one line per outermost Text, with nested Text joined inline. */
export function textOf(root: ReactTestInstance): string {
  const collect = (node: ReactTestInstance | string): string => {
    if (typeof node === 'string') return node;
    return node.children.map((c) => collect(c as ReactTestInstance | string)).join('');
  };
  const isNested = (node: ReactTestInstance) => {
    let p = node.parent;
    while (p) {
      if (p.type === Text) return true;
      p = p.parent;
    }
    return false;
  };
  return root
    .findAllByType(Text)
    .filter((t) => !isNested(t))
    .map((t) => collect(t))
    .join('\n');
}

export function byLabel(root: ReactTestInstance, label: string): ReactTestInstance {
  const found = root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function');
  if (found.length === 0) throw new Error(`No pressable labelled "${label}"`);
  return found[0];
}

export async function press(node: ReactTestInstance): Promise<void> {
  await act(async () => {
    node.props.onPress();
  });
  await flush();
}

/** Presses the innermost pressable whose rendered text is exactly `text`. */
export async function pressText(root: ReactTestInstance, text: string): Promise<void> {
  const matches = root.findAll((n) => typeof n.props.onPress === 'function' && textOf(n).trim() === text);
  if (matches.length === 0) throw new Error(`No pressable with text "${text}"`);
  await press(matches[matches.length - 1]);
}

/**
 * Every pressable either shows text or carries an accessibility label, so
 * icon-only controls are announced. Returns the offenders' types for a readable failure.
 */
export function unlabelledPressables(root: ReactTestInstance): string[] {
  return root
    .findAll((n) => typeof n.props.onPress === 'function' && typeof n.type !== 'string')
    .filter((n) => {
      if (n.props.accessibilityLabel || n.props.accessibilityElementsHidden) return false;
      if (n.findAll((c) => c !== n && !!c.props.accessibilityLabel).length > 0) return false;
      const own = n.findAll((c) => typeof c.props.children === 'string' || typeof c.props.children === 'number');
      return textOf(n).trim() === '' && own.length === 0;
    })
    .map((n) => (typeof n.type === 'function' ? n.type.name || 'anonymous' : String(n.type)));
}
