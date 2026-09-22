import React, { useState } from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { UserScope } from '../UserScope';
import { ResourceCache } from '../../hooks/cache';

let mockUser: { id: string } | null = { id: 'user-a' };
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));

const plans = new ResourceCache<string>();

/** Stands in for a provider that keeps state for the signed-in user. */
const Stateful: React.FC = () => {
  const [value] = useState(() => plans.get('all') ?? 'empty');
  return <Text>{value}</Text>;
};

const tree = () => (
  <UserScope>
    <Stateful />
  </UserScope>
);

describe('UserScope', () => {
  it('clears cached data and remounts its children when the user changes', async () => {
    await plans.load('all', async () => "user A's plans");
    let r!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      r = ReactTestRenderer.create(tree());
    });
    expect(r.root.findByType(Text).props.children).toBe("user A's plans");

    mockUser = null;
    await act(async () => r.update(tree()));
    mockUser = { id: 'user-b' };
    await act(async () => r.update(tree()));

    expect(plans.has('all')).toBe(false);
    expect(r.root.findByType(Text).props.children).toBe('empty');
    await act(async () => r.unmount());
  });

  it('keeps data when the same user re-renders', async () => {
    mockUser = { id: 'user-c' };
    await plans.load('all', async () => "user C's plans");
    let r!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      r = ReactTestRenderer.create(tree());
    });
    await act(async () => r.update(tree()));
    expect(plans.get('all')).toBe("user C's plans");
    await act(async () => r.unmount());
  });
});
