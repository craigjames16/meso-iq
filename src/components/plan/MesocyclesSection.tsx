import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { mesocyclesService } from '../../services/mesocyclesService';
import { plansService } from '../../services/plansService';
import { MesocycleListItem, Plan } from '../../types/plan';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { BottomDrawer } from '../BottomDrawer';

type MesocyclesSectionNavigationProp = NativeStackNavigationProp<RootStackParamList, 'MesocycleDetail'>;

export interface MesocyclesSectionRef {
  openCreateDialog: () => void;
}

export const MesocyclesSection = forwardRef<MesocyclesSectionRef>((props, ref) => {
  const navigation = useNavigation<MesocyclesSectionNavigationProp>();
  const [mesocycles, setMesocycles] = useState<MesocycleListItem[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMesocycle, setNewMesocycle] = useState({
    name: '',
    planId: '',
    iterations: 4,
  });
  const [creating, setCreating] = useState(false);
  const [planPickerVisible, setPlanPickerVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    openCreateDialog: () => setModalVisible(true),
  }));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [mesocyclesData, plansData] = await Promise.all([
        mesocyclesService.getMesocycles(),
        plansService.getPlans(),
      ]);
      setMesocycles(mesocyclesData);
      setPlans(plansData);
    } catch (err: any) {
      console.error('Failed to fetch data', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMesocycle = async () => {
    if (!newMesocycle.name.trim() || !newMesocycle.planId || newMesocycle.iterations < 1) {
      return;
    }

    try {
      setCreating(true);
      const data = await mesocyclesService.createMesocycle({
        name: newMesocycle.name.trim(),
        planId: newMesocycle.planId,
        iterations: newMesocycle.iterations,
      });
      setMesocycles(prev => [data, ...prev]);
      setModalVisible(false);
      setNewMesocycle({ name: '', planId: '', iterations: 4 });
    } catch (err: any) {
      console.error('Failed to create mesocycle', err);
      setError(err.message || 'Failed to create mesocycle');
    } finally {
      setCreating(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'COMPLETE':
        return <MaterialIcons name="check-circle" size={24} color={themeColors.accent.success} />;
      case 'IN_PROGRESS':
        return <MaterialIcons name="play-circle-filled" size={24} color={themeColors.primary.main} />;
      default:
        return <MaterialIcons name="play-circle-outline" size={24} color={themeColors.text.secondary} />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'IN_PROGRESS') {
      return (
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>In Progress</Text>
        </View>
      );
    }
    if (status === 'COMPLETE') {
      return (
        <View style={[styles.statusBadge, styles.completeBadge]}>
          <Text style={[styles.statusBadgeText, styles.completeBadgeText]}>Complete</Text>
        </View>
      );
    }
    return null;
  };

  const selectedPlan = plans.find(p => String(p.id) === newMesocycle.planId);

  const renderMesocycleCard = ({ item }: { item: MesocycleListItem }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          navigation.navigate('MesocycleDetail', { mesocycleId: item.id });
        }}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            {getStatusIcon(item.status)}
            <Text style={styles.cardTitle}>{item.name}</Text>
          </View>
          <View style={styles.cardInfo}>
            <MaterialIcons
              name="fitness-center"
              size={16}
              color={themeColors.text.secondary}
            />
            <Text style={styles.cardSubtext}>Based on: {item.plan.name}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.iterations} iterations</Text>
            </View>
            {getStatusBadge(item.status)}
            <Text style={styles.viewDetails}>
              {item.status === 'IN_PROGRESS' ? 'Continue Mesocycle →' : 'View Details →'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
        <Text style={styles.loadingText}>Loading mesocycles...</Text>
      </View>
    );
  }

  if (error && mesocycles.length === 0) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={mesocycles}
        renderItem={renderMesocycleCard}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No mesocycles yet</Text>
            <Text style={styles.emptySubtext}>
              Create your first mesocycle to get started
            </Text>
          </View>
        }
      />

      {/* Create Mesocycle Drawer */}
      <BottomDrawer
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Create New Mesocycle"
        height="70%"
      >
        <View style={styles.drawerContent}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.textInput}
            value={newMesocycle.name}
            onChangeText={(text) => setNewMesocycle(prev => ({ ...prev, name: text }))}
            placeholder="Enter mesocycle name"
            placeholderTextColor={themeColors.text.muted}
            autoFocus
          />

          <Text style={styles.inputLabel}>Base Plan</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setPlanPickerVisible(!planPickerVisible)}
          >
            <Text style={selectedPlan ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
              {selectedPlan ? selectedPlan.name : 'Select a plan'}
            </Text>
            <MaterialIcons
              name={planPickerVisible ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={24}
              color={themeColors.text.secondary}
            />
          </TouchableOpacity>
          {planPickerVisible && (
            <View style={styles.dropdownList}>
              <FlatList
                data={plans}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      String(item.id) === newMesocycle.planId && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setNewMesocycle(prev => ({ ...prev, planId: String(item.id) }));
                      setPlanPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        String(item.id) === newMesocycle.planId && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {String(item.id) === newMesocycle.planId && (
                      <MaterialIcons
                        name="check"
                        size={20}
                        color={themeColors.primary.main}
                      />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.dropdownEmpty}>
                    <Text style={styles.dropdownEmptyText}>No plans available</Text>
                  </View>
                }
              />
            </View>
          )}

          <Text style={styles.inputLabel}>Number of Iterations</Text>
          <View style={styles.iterationsContainer}>
            {[3, 4, 5].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.iterationBox,
                  newMesocycle.iterations === num && styles.iterationBoxSelected,
                ]}
                onPress={() => setNewMesocycle(prev => ({ ...prev, iterations: num }))}
              >
                <Text
                  style={[
                    styles.iterationBoxText,
                    newMesocycle.iterations === num && styles.iterationBoxTextSelected,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.drawerFooter}>
            <TouchableOpacity
              style={[styles.drawerButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.drawerButton,
                styles.createButton,
                (!newMesocycle.name.trim() || !newMesocycle.planId || newMesocycle.iterations < 1 || creating) && styles.createButtonDisabled,
              ]}
              onPress={handleCreateMesocycle}
              disabled={!newMesocycle.name.trim() || !newMesocycle.planId || newMesocycle.iterations < 1 || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color={themeColors.text.primary} />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomDrawer>
    </View>
  );
});

MesocyclesSection.displayName = 'MesocyclesSection';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  card: {
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
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: `rgba(136, 132, 216, 0.1)`,
    borderWidth: 1,
    borderColor: themeColors.primary.main,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: themeColors.primary.main,
    fontSize: 12,
    fontWeight: '600',
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
  completeBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  completeBadgeText: {
    color: 'rgba(76, 175, 80, 0.9)',
  },
  viewDetails: {
    fontSize: 14,
    color: themeColors.text.secondary,
    marginLeft: 'auto',
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
  drawerContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 4,
  },
  inputLabel: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
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
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  pickerButtonText: {
    color: themeColors.text.primary,
    fontSize: 16,
  },
  pickerButtonPlaceholder: {
    color: themeColors.text.muted,
    fontSize: 16,
  },
  dropdownList: {
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(136, 132, 216, 0.15)',
  },
  dropdownItemText: {
    color: themeColors.text.primary,
    fontSize: 15,
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: themeColors.primary.main,
    fontWeight: '600',
  },
  dropdownEmpty: {
    padding: spacing.md,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    color: themeColors.text.muted,
    fontSize: 14,
  },
  iterationsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iterationBox: {
    flex: 1,
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iterationBoxSelected: {
    backgroundColor: 'rgba(136, 132, 216, 0.15)',
    borderColor: themeColors.primary.main,
    borderWidth: 2,
  },
  iterationBoxText: {
    color: themeColors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  iterationBoxTextSelected: {
    color: themeColors.primary.main,
  },
  drawerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  drawerButton: {
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

