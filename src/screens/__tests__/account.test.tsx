import { act } from 'react-test-renderer';
import { SignInScreen } from '../auth/SignInScreen';
import { SignUpScreen } from '../auth/SignUpScreen';
import { AccountSettingsScreen } from '../main/AccountSettingsScreen';
import { pressText, renderScreen, textOf, unlabelledPressables } from '../../testing/render';

const mockSignIn = jest.fn(async () => {
  throw new Error('Invalid email or password');
});
const mockSignUp = jest.fn(async () => undefined);
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'craig@example.com', name: null },
    signIn: mockSignIn,
    signUp: mockSignUp,
    signOut: jest.fn(),
    deleteAccount: jest.fn(),
  }),
}));

const type = async (root: any, label: string, text: string) => {
  const input = root.findAll((n: any) => n.props.accessibilityLabel === label && typeof n.props.onChangeText === 'function')[0];
  await act(async () => input.props.onChangeText(text));
};

describe('Auth and account', () => {
  it('shows sign-in errors inline and keeps the auth call', async () => {
    const r = await renderScreen('SignIn', SignInScreen);
    await pressText(r.root, 'Sign in');
    expect(textOf(r.root)).toContain('Enter your email.');
    await type(r.root, 'EMAIL', 'craig@example.com');
    await type(r.root, 'PASSWORD', 'secret');
    await pressText(r.root, 'Sign in');
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'craig@example.com', password: 'secret' });
    expect(textOf(r.root)).toContain('Invalid email or password');
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });

  it('validates sign-up before calling the API', async () => {
    const r = await renderScreen('SignUp', SignUpScreen);
    await type(r.root, 'EMAIL', 'new@example.com');
    await type(r.root, 'PASSWORD', 'short');
    await pressText(r.root, 'Create account');
    expect(textOf(r.root)).toContain('Use at least 8 characters.');
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });

  it('shows the account screen', async () => {
    const r = await renderScreen('AccountSettings', AccountSettingsScreen);
    const text = textOf(r.root);
    expect(text).toContain('Signed in');
    expect(text).toContain('craig@example.com');
    expect(text).toContain('Download my data');
    expect(text).toContain('Delete account');
    expect(text).toMatch(/MesoIQ 0\.0\.1/);
    expect(unlabelledPressables(r.root)).toEqual([]);
    await act(async () => r.unmount());
  });
});
