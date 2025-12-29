import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';
import { dashboardService, Mesocycle } from '../../services/dashboardService';

interface MesocycleSelectProps {
  value: number | 'all';
  onChange: (value: number | 'all') => void;
  showAllTime?: boolean;
}

export const MesocycleSelect: React.FC<MesocycleSelectProps> = ({
  value,
  onChange,
  showAllTime = true,
}) => {
  const [mesocycles, setMesocycles] = useState<Mesocycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMesocycles = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardService.getMesocycles();
        setMesocycles(data);
      } catch (err: any) {
        console.error('Failed to fetch mesocycles', err);
        setError(err.message || 'Failed to load mesocycles');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMesocycles();
  }, []);

  const getSelectedLabel = (): string => {
    if (value === 'all') return 'All Time';
    const selected = mesocycles.find(m => m.id === value);
    return selected?.name || 'Select Mesocycle';
  };

  const handleSelect = (selectedValue: number | 'all') => {
    onChange(selectedValue);
    setModalVisible(false);
  };

  const renderItem = ({ item }: { item: { id: number | 'all'; name: string } }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        value === item.id && styles.selectedOption,
      ]}
      onPress={() => handleSelect(item.id)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.optionText,
          value === item.id && styles.selectedOptionText,
        ]}
      >
        {item.name}
      </Text>
      {value === item.id && (
        <MaterialIcons
          name="check"
          size={20}
          color={themeColors.primary.main}
        />
      )}
    </TouchableOpacity>
  );

  const options = [
    ...(showAllTime ? [{ id: 'all' as const, name: 'All Time' }] : []),
    ...mesocycles.map(m => ({ id: m.id, name: m.name })),
  ];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={themeColors.text.secondary} />
        ) : (
          <>
            <Text style={styles.selectorText} numberOfLines={1}>
              {getSelectedLabel()}
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={24}
              color={themeColors.text.secondary}
            />
          </>
        )}
      </TouchableOpacity>

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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Mesocycle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={themeColors.text.secondary}
                />
              </TouchableOpacity>
            </View>
            
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <FlatList
                data={options}
                renderItem={renderItem}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                style={styles.optionsList}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: themeColors.background.surface,
    borderWidth: 1,
    borderColor: themeColors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minWidth: 180,
  },
  selectorText: {
    color: themeColors.text.primary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: spacing.sm,
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
    maxHeight: '70%',
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
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.default,
  },
  selectedOption: {
    backgroundColor: 'rgba(136, 132, 216, 0.15)',
  },
  optionText: {
    color: themeColors.text.primary,
    fontSize: 15,
    flex: 1,
  },
  selectedOptionText: {
    color: themeColors.primary.main,
    fontWeight: '600',
  },
  errorContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    color: themeColors.accent.error,
    fontSize: 14,
    textAlign: 'center',
  },
});

