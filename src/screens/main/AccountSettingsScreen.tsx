import React, { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { downloadSetsCsvExport } from '../../services/userDataExportService';
import { Card, DetailHeader, MenuAction, MenuGroup, Screen, SectionLabel } from '../../components/ui';
import { colors, radius, type } from '../../theme';
import packageJson from '../../../package.json';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const AccountSettingsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, signOut, deleteAccount } = useAuth();
  const [exporting, setExporting] = useState(false);
  const email = user?.email ?? '';

  const handleSignOut = () =>
    Alert.alert('Sign out?', "You'll need your email and password to sign back in.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch {
            Alert.alert("Couldn't sign out", 'Try again.');
          }
        },
      },
    ]);

  const handleDeleteAccount = () =>
    Alert.alert(
      'Delete account',
      'This will permanently disable your account. Your workout data will be kept for 90 days, after which it will be deleted. You will not be able to sign in again. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Confirm deletion', 'Are you absolutely sure you want to delete your account?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteAccount();
                  } catch {
                    Alert.alert("Couldn't delete the account", 'Try again.');
                  }
                },
              },
            ]),
        },
      ],
    );

  const handleDownload = async () => {
    setExporting(true);
    try {
      const { body, filename } = await downloadSetsCsvExport();
      await Share.share({ message: body, title: filename?.replace(/\.csv$/i, '') || 'MesoIQ workout data export' });
    } catch (err) {
      Alert.alert("Couldn't export your data", err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen bottom="none">
      <DetailHeader title="Account" onBack={() => navigation.goBack()} />

      <Card padding={16}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>{(email[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.signedIn}>Signed in</Text>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>
      </Card>

      <SectionLabel>DATA</SectionLabel>
      <Card gap={0}>
        <MenuAction
          label={exporting ? 'Preparing your data…' : 'Download my data'}
          meta="Every program, cycle and set, as a file"
          onPress={handleDownload}
          disabled={exporting}
        />
      </Card>

      <SectionLabel>ACCOUNT</SectionLabel>
      <Card gap={0}>
        <MenuGroup>
          <MenuAction label="Sign out" onPress={handleSignOut} />
          <MenuAction label="Delete account" meta="Removes all programs, cycles and logged sets" destructive onPress={handleDeleteAccount} />
        </MenuGroup>
      </Card>

      {__DEV__ ? (
        <Card gap={0} variant="subtle">
          <MenuAction label="Style guide" meta="Development builds only" onPress={() => navigation.navigate('StyleGuide')} />
        </Card>
      ) : null}

      <Text style={styles.footer}>MesoIQ {packageJson.version}</Text>
    </Screen>
  );
};

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.round,
    backgroundColor: colors.surface.field,
    borderWidth: 1,
    borderColor: colors.border.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { ...type.cardTitle, color: colors.text.secondary },
  flex: { flex: 1, gap: 2 },
  signedIn: { ...type.metaSmall, color: colors.text.muted },
  email: { ...type.body, fontWeight: '600', color: colors.text.primary },
  footer: { ...type.metaSmall, color: colors.text.faint, textAlign: 'center', marginTop: 8 },
});
