import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { plansService } from '../../services/plansService';
import { Plan } from '../../types/plan';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export interface PlansSectionRef {
  openCreateDialog: () => void;
}

type PlansSectionNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PlanDetail'>;

export const PlansSection = forwardRef<PlansSectionRef>((props, ref) => {
  const navigation = useNavigation<PlansSectionNavigationProp>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [creating, setCreating] = useState(false);

  useImperativeHandle(ref, () => ({
    openCreateDialog: () => setModalVisible(true),
  }));

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await plansService.getPlans();
      setPlans(data);
    } catch (err: any) {
      console.error('Failed to fetch plans', err);
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) return;

    try {
      setCreating(true);
      // For now, create with empty days array - plan creation UI can be added later
      const newPlan = await plansService.createPlan({
        name: newPlanName.trim(),
        days: [],
      });
      setPlans(prev => [newPlan, ...prev]);
      setModalVisible(false);
      setNewPlanName('');
    } catch (err: any) {
      console.error('Failed to create plan', err);
      setError(err.message || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const renderPlanCard = ({ item }: { item: Plan }) => {
    const hasActiveInstance = item.instances?.some(i => i?.status === 'IN_PROGRESS');

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          navigation.navigate('PlanDetail', { planId: item.id });
        }}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <MaterialIcons
              name="fitness-center"
              size={24}
              color={themeColors.primary.main}
            />
            <Text style={styles.cardTitle}>{item.name}</Text>
          </View>
          <View style={styles.cardInfo}>
            <MaterialIcons
              name="calendar-today"
              size={16}
              color={themeColors.text.secondary}
            />
            <Text style={styles.cardSubtext}>{item.days.length} days</Text>
          </View>
          <View style={styles.cardFooter}>
            {hasActiveInstance && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>In Progress</Text>
              </View>
            )}
            <Text style={styles.viewDetails}>View Details →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading plans...</Text>
      </View>
    );
  }

  if (error && plans.length === 0) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchPlans} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={plans}
        renderItem={renderPlanCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No plans yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first plan to get started
            </Text>
          </View>
        }
      />

      {/* Create Plan Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Plan</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={themeColors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Plan Name</Text>
              <TextInput
                style={styles.textInput}
                value={newPlanName}
                onChangeText={setNewPlanName}
                placeholder="Enter plan name"
                placeholderTextColor={themeColors.text.muted}
                autoFocus
              />
              <Text style={styles.modalNote}>
                Note: Plan days can be configured later
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.createButton,
                  (!newPlanName.trim() || creating) && styles.createButtonDisabled,
                ]}
                onPress={handleCreatePlan}
                disabled={!newPlanName.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color={themeColors.text.primary} />
                ) : (
                  <Text style={styles.createButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

PlansSection.displayName = 'PlansSection';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    // backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardContent: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardSubtext: {
    fontSize: 14,
    color: themeColors.text.secondary,
    marginLeft: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusBadgeText: {
    color: 'rgba(255, 193, 7, 0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  viewDetails: {
    fontSize: 14,
    color: themeColors.text.secondary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    marginTop: spacing.sm,
  },
  errorText: {
    color: themeColors.accent.error,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  retryText: {
    color: themeColors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    color: themeColors.text.secondary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    color: themeColors.text.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: themeColors.background.primary,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  modalTitle: {
    color: themeColors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: spacing.md,
  },
  inputLabel: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: themeColors.text.primary,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  modalNote: {
    color: themeColors.text.muted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: themeColors.border.default,
    gap: spacing.sm,
  },
  modalButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
  },
  cancelButtonText: {
    color: themeColors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: themeColors.primary.main,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

