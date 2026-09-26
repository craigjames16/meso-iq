import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button, CheckGlyph, TextField } from '../../components/ui';
import { colors, radius, type } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

const PRIVACY_POLICY_URL = 'https://www.meso-iq.com/privacy-policy';
const TERMS_OF_SERVICE_URL = 'https://www.meso-iq.com/terms-of-service';
const MIN_PASSWORD = 8;

type Field = 'email' | 'password' | 'confirm' | 'terms' | 'form';

export const SignUpScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ field: Field; message: string } | null>(null);

  const openLegalUrl = (url: string) => {
    Linking.openURL(url).catch(() => setError({ field: 'terms', message: "Couldn't open the link. Try again." }));
  };

  /** The first problem with the form, or null when it can be submitted. */
  const problem = (): { field: Field; message: string } | null => {
    if (!email.trim()) return { field: 'email', message: 'Enter your email.' };
    if (password.length < MIN_PASSWORD) return { field: 'password', message: `Use at least ${MIN_PASSWORD} characters.` };
    if (password !== confirmPassword) return { field: 'confirm', message: "Passwords don't match." };
    if (!acceptedTerms) return { field: 'terms', message: 'Accept the Privacy Policy and Terms of Service to continue.' };
    return null;
  };

  const handleSignUp = async () => {
    const p = problem();
    setError(p);
    if (p) return;
    setIsLoading(true);
    try {
      await signUp({ email: email.trim(), password });
    } catch (err: any) {
      setError({ field: 'form', message: err?.message || 'Something went wrong. Try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const errorFor = (f: Field) => (error?.field === f ? error.message : null);

  return (
    <AuthLayout title="Create your account" line="One account for your programs, cycles and every set you log.">
      <TextField
        label="EMAIL"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        editable={!isLoading}
        error={errorFor('email')}
      />
      <TextField
        label="PASSWORD"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        editable={!isLoading}
        accessory={{ label: showPassword ? 'Hide' : 'Show', onPress: () => setShowPassword((v) => !v) }}
        error={errorFor('password')}
      />
      <TextField
        label="CONFIRM PASSWORD"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Type it again"
        secureTextEntry={!showConfirm}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        editable={!isLoading}
        accessory={{ label: showConfirm ? 'Hide' : 'Show', onPress: () => setShowConfirm((v) => !v) }}
        error={errorFor('confirm')}
      />
      <View style={styles.terms}>
        <Pressable
          onPress={() => setAcceptedTerms((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
          accessibilityLabel="I agree to the Privacy Policy and Terms of Service"
          hitSlop={8}
          style={[styles.box, acceptedTerms && styles.boxOn]}
        >
          {acceptedTerms ? <CheckGlyph size={14} /> : null}
        </Pressable>
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text style={styles.link} onPress={() => openLegalUrl(PRIVACY_POLICY_URL)} accessibilityRole="link">
            Privacy Policy
          </Text>{' '}
          and{' '}
          <Text style={styles.link} onPress={() => openLegalUrl(TERMS_OF_SERVICE_URL)} accessibilityRole="link">
            Terms of Service
          </Text>
          .
        </Text>
      </View>
      {errorFor('terms') || errorFor('form') ? <Text style={styles.error}>{errorFor('terms') ?? errorFor('form')}</Text> : null}
      <Button label="Create account" onPress={handleSignUp} loading={isLoading} full />
      <Pressable onPress={() => navigation.navigate('SignIn')} accessibilityRole="link" style={styles.switch}>
        <Text style={styles.switchText}>
          Already have an account? <Text style={styles.switchLink}>Sign in</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  terms: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.badge,
    borderWidth: 1.5,
    borderColor: colors.border.stronger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.action.fill, borderColor: colors.action.fill },
  termsText: { flex: 1, ...type.meta, color: colors.text.secondary },
  link: { fontWeight: '600', color: colors.text.primary, textDecorationLine: 'underline' },
  error: { ...type.metaSmall, color: colors.danger.base },
  switch: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  switchText: { ...type.body, color: colors.text.secondary },
  switchLink: { fontWeight: '600', color: colors.text.primary },
});
