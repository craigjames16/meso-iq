import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../hooks/useAuth';

export const AccountSettingsScreen: React.FC = () => {
  const { user, signOut, deleteAccount } = useAuth();
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);

  const handleSignOut = () => {
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
  };

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <MaterialIcons name="logout" size={20} color="#ff4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.dangerZone}>
          <TouchableOpacity
            style={styles.dangerZoneHeader}
            onPress={() => setDangerZoneOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: dangerZoneOpen }}
            accessibilityLabel="Danger zone"
          >
            <MaterialIcons name="warning-amber" size={22} color="#c9a227" />
            <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
            <MaterialIcons
              name={dangerZoneOpen ? 'expand-less' : 'expand-more'}
              size={28}
              color="#888"
              style={styles.dangerZoneChevron}
            />
          </TouchableOpacity>
          {dangerZoneOpen ? (
            <View style={styles.dangerZoneBody}>
              <Text style={styles.dangerZoneHint}>
                Permanently delete your account. This cannot be undone from the
                app.
              </Text>
              <TouchableOpacity
                style={styles.deleteAccountButton}
                onPress={handleDeleteAccount}
              >
                <MaterialIcons name="delete-forever" size={20} color="#ff6666" />
                <Text style={styles.deleteAccountText}>Delete account</Text>
              </TouchableOpacity>
            </View>
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
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#553333',
    marginBottom: 12,
  },
  deleteAccountText: {
    color: '#ff6666',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a3d1a',
    backgroundColor: '#221f18',
    overflow: 'hidden',
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  dangerZoneTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#d4b84a',
  },
  dangerZoneChevron: {
    marginLeft: 'auto',
  },
  dangerZoneBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#3d3520',
  },
  dangerZoneHint: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
    marginBottom: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  signOutText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

