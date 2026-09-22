import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space, type, size } from '../../theme';

export const AuthLayout: React.FC<{ title: string; line: string; children: React.ReactNode }> = ({ title, line, children }) => {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.wordmark}>MesoIQ</Text>
        <View style={styles.titles}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.line}>{line}</Text>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.gutter + 8, gap: 18 },
  wordmark: { ...type.cardTitle, fontSize: size.sheet, fontWeight: '700', letterSpacing: -0.2, color: colors.text.primary },
  titles: { gap: 6, marginTop: 20, marginBottom: 8 },
  title: { ...type.tabTitle, color: colors.text.primary },
  line: { ...type.body, color: colors.text.secondary },
});
