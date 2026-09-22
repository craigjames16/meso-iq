import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button, TextField } from '../../components/ui';
import { colors, type } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

export const SignInScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ field: 'email' | 'password' | 'form'; message: string } | null>(null);

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError({ field: 'email', message: 'Enter your email.' });
      return;
    }
    if (!password.trim()) {
      setError({ field: 'password', message: 'Enter your password.' });
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signIn({ email: email.trim(), password });
      // AppNavigator switches stacks when the auth state changes.
    } catch (err: any) {
      setError({ field: 'form', message: err?.message || 'Invalid email or password' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign in" line="Train in blocks. See what's working.">
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
        error={error?.field === 'email' ? error.message : null}
      />
      <TextField
        label="PASSWORD"
        value={password}
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        editable={!isLoading}
        onSubmitEditing={handleSignIn}
        returnKeyType="go"
        accessory={{ label: showPassword ? 'Hide' : 'Show', onPress: () => setShowPassword((v) => !v) }}
        error={error?.field === 'password' || error?.field === 'form' ? error.message : null}
      />
      <Button label="Sign in" onPress={handleSignIn} loading={isLoading} full />
      <Pressable onPress={() => navigation.navigate('SignUp')} accessibilityRole="link" style={styles.switch}>
        <Text style={styles.switchText}>
          New to MesoIQ? <Text style={styles.switchLink}>Create an account</Text>
        </Text>
      </Pressable>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  switch: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  switchText: { ...type.body, color: colors.text.secondary },
  switchLink: { fontWeight: '600', color: colors.text.primary },
});
