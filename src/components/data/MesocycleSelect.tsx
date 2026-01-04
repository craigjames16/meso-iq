import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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

  useEffect(() => {
    if (modalVisible) {
      // Fade in animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal closes
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [modalVisible]);

  const getSelectedLabel = (): string => {
    if (value === 'all') return 'All Time';
    const selected = mesocycles.find(m => m.id === value);
    return selected?.name || 'Select Mesocycle';
  };

  const handleValueChange = (selectedValue: string | number) => {
    if (selectedValue === 'all') {
      onChange('all');
    } else {
      onChange(Number(selectedValue));
    }
    // On iOS, the picker is always visible, so we don't close the modal
    // On Android, close the modal after selection
    if (Platform.OS === 'android') {
      setModalVisible(false);
    }
  };

  const handleDone = () => {
    setModalVisible(false);
  };

  const pickerValue = value === 'all' ? 'all' : value;

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
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
            {Platform.OS === 'ios' && (
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Mesocycle</Text>
                <View style={styles.placeholder} />
              </View>
            )}
            
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <View style={styles.pickerContainer}>
                {Platform.OS === 'android' ? (
                  <View style={styles.pickerAndroidWrapper}>
                    <Text style={styles.pickerSelectedText}>
                      {getSelectedLabel()}
                    </Text>
                    <Picker
                      selectedValue={pickerValue}
                      onValueChange={handleValueChange}
                      style={styles.pickerAndroid}
                      dropdownIconColor={themeColors.text.secondary}
                      mode="dropdown"
                    >
                      {showAllTime && (
                        <Picker.Item
                          label="All Time"
                          value="all"
                          color={themeColors.text.primary}
                        />
                      )}
                      {mesocycles.map((mesocycle) => (
                        <Picker.Item
                          key={mesocycle.id}
                          label={mesocycle.name}
                          value={mesocycle.id}
                          color={themeColors.text.primary}
                        />
                      ))}
                    </Picker>
                  </View>
                ) : (
                  <Picker
                    selectedValue={pickerValue}
                    onValueChange={handleValueChange}
                    style={styles.pickerIOS}
                    itemStyle={styles.pickerItemStyle}
                  >
                    {showAllTime && (
                      <Picker.Item
                        label="All Time"
                        value="all"
                        color={themeColors.text.primary}
                      />
                    )}
                    {mesocycles.map((mesocycle) => (
                      <Picker.Item
                        key={mesocycle.id}
                        label={mesocycle.name}
                        value={mesocycle.id}
                        color={themeColors.text.primary}
                      />
                    ))}
                  </Picker>
                )}
              </View>
            )}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </View>
  );
};

const windowWidth = Dimensions.get('window').width;
const modalWidth = windowWidth * 0.98;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    width: modalWidth,
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
    flex: 1,
    textAlign: 'center',
  },
  doneButton: {
    color: themeColors.primary.main,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 50,
  },
  placeholder: {
    minWidth: 50,
  },
  pickerContainer: {
    maxHeight: Platform.OS === 'ios' ? 216 : 'auto',
    overflow: 'hidden',
  },
  pickerIOS: {
    height: 216,
    backgroundColor: themeColors.background.primary,
  },
  pickerItemStyle: {
    color: themeColors.text.primary,
  },
  pickerAndroidWrapper: {
    position: 'relative',
    width: '100%',
  },
  pickerSelectedText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    color: themeColors.text.primary,
    fontSize: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    textAlignVertical: 'center',
    pointerEvents: 'none',
    zIndex: 1,
  },
  pickerAndroid: {
    opacity: 0,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
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

