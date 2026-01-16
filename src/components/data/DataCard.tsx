import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { themeColors, borderRadius, spacing } from '../../theme/colors';

interface DataCardProps {
  title: string;
  children: React.ReactNode;
  onPress?: () => void;
}

export const DataCard: React.FC<DataCardProps> = ({ title, children, onPress }) => {
  const CardWrapper = onPress ? TouchableOpacity : View;
  
  return (
    <CardWrapper 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>
        {children}
      </View>
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: themeColors.border.light,
    padding: spacing.md,
    flex: 1,
    minWidth: '47%',
  },
  title: {
    color: themeColors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

