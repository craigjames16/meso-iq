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

/** All text rendered on screen, joined by newlines. */
export function textOf(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map((t) => {
      const c = t.props.children;
      return Array.isArray(c) ? c.flat(Infinity).filter((x: unknown) => typeof x === 'string' || typeof x === 'number').join('') : typeof c === 'string' || typeof c === 'number' ? String(c) : '';
    })
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
