import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

interface PlanNameSectionProps {
  planName: string;
  onPlanNameChange: (name: string) => void;
}

export const PlanNameSection: React.FC<PlanNameSectionProps> = ({
  planName,
  onPlanNameChange,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons
          name="fitness-center"
          size={20}
          color={themeColors.primary.main}
        />
        <Text style={styles.headerText}>Plan Details</Text>
      </View>
      <TextInput
        style={styles.input}
        value={planName}
        onChangeText={onPlanNameChange}
        placeholder="Enter plan name"
        placeholderTextColor={themeColors.text.muted}
        autoCapitalize="words"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: themeColors.background.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
  },
  input: {
    backgroundColor: themeColors.background.elevated,
    borderWidth: 1,
    borderColor: themeColors.border.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: themeColors.text.primary,
    fontSize: 16,
  },
});

