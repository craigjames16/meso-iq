import React, { useState, useLayoutEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../hooks/useAuth';
import { themeColors, spacing, borderRadius } from '../../theme/colors';
import { downloadSetsCsvExport } from '../../services/userDataExportService';

export const AccountSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, signOut, deleteAccount } = useAuth();
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  }, [signOut]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSignOut}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={styles.headerSignOut}
        >
          <Text style={styles.headerSignOutText}>Sign out</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSignOut]);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently disable your account. Your workout data will be kept for 90 days, after which it will be deleted. You will not be able to sign in again. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm deletion',
              'Are you absolutely sure you want to delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete account');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleDownloadMyData = async () => {
    setExportingData(true);
    try {
      const { body, filename } = await downloadSetsCsvExport();
      const title =
        filename?.replace(/\.csv$/i, '') || 'MesoIQ workout data export';
      await Share.share({
        message: body,
        title,
      });
    } catch (err) {
      Alert.alert(
        'Could not export data',
        err instanceof Error ? err.message : 'Something went wrong.'
      );
    } finally {
      setExportingData(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
        </View>
      </View>

      <View style={[styles.section, styles.dataSection]}>
        <Text style={styles.sectionTitle}>Data</Text>
        <Text style={styles.dataDescription}>
          Download your training history as a spreadsheet, or permanently delete
          your account. Deleted accounts keep data for 90 days per policy, then it
          is removed.
        </Text>

        <View style={styles.dataPanel}>
          <TouchableOpacity
            style={styles.dataRow}
            onPress={handleDownloadMyData}
            disabled={exportingData}
            accessibilityRole="button"
            accessibilityLabel="Download my data"
          >
            {exportingData ? (
              <ActivityIndicator color={themeColors.primary.light} size="small" />
            ) : (
              <MaterialIcons
                name="download"
                size={22}
                color={themeColors.primary.light}
              />
            )}
            <Text style={styles.dataRowLabel}>Download my data</Text>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={themeColors.text.muted}
            />
          </TouchableOpacity>

          <View style={styles.dataRowSeparator} />

          <TouchableOpacity
            style={styles.dataRow}
            onPress={() => setDangerZoneOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: dangerZoneOpen }}
            accessibilityLabel="Delete account options"
          >
            <MaterialIcons
              name="delete-outline"
              size={22}
              color={themeColors.accent.error}
            />
            <Text style={styles.dataRowLabelDanger}>Delete account</Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={22}
              color={themeColors.text.muted}
              style={dangerZoneOpen ? styles.dataRowArrowOpen : undefined}
            />
          </TouchableOpacity>

          {dangerZoneOpen ? (
            <>
              <View style={styles.dataRowSeparator} />
              <View style={styles.dataExpanded}>
                <Text style={styles.dataExpandedHint}>
                  This disables sign-in and schedules your data for deletion. You
                  will confirm in the next step.
                </Text>
                <TouchableOpacity
                  style={styles.dataRow}
                  onPress={handleDeleteAccount}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm delete account"
                >
                  <MaterialIcons
                    name="delete-forever"
                    size={22}
                    color={themeColors.accent.error}
                  />
                  <Text style={styles.dataRowLabelDanger}>
                    Permanently delete my account
                  </Text>
                  <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color={themeColors.text.muted}
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  dataSection: {
    alignSelf: 'stretch',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    fontSize: 16,
    color: '#999',
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  dataDescription: {
    fontSize: 14,
    color: themeColors.text.muted,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  dataPanel: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dataRowSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: themeColors.border.default,
  },
  dataRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.primary.light,
  },
  dataRowLabelDanger: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.accent.error,
  },
  dataRowArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dataExpanded: {
    paddingBottom: spacing.sm,
  },
  dataExpandedHint: {
    fontSize: 13,
    color: themeColors.text.muted,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  headerSignOut: {
    marginRight: 4,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  headerSignOutText: {
    color: themeColors.accent.error,
    fontSize: 16,
    fontWeight: '600',
  },
});

