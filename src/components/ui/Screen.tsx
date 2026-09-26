import React from 'react';
import { ScrollView, StyleSheet, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Tab screens clear the floating tab bar; stack screens don't need to. */
  bottom?: 'tabBar' | 'footer' | 'none';
  /** Detail screens with their own header handle the top inset themselves. */
  topInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  keyboardShouldPersistTaps?: 'always' | 'handled' | 'never';
}

const FOOTER_CLEARANCE = 96;

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = true,
  refreshControl,
  bottom = 'tabBar',
  topInset = true,
  contentStyle,
  footer,
  keyboardShouldPersistTaps = 'handled',
}) => {
  const insets = useSafeAreaInsets();
  const paddingBottom =
    bottom === 'tabBar'
      ? space.screenBottom + insets.bottom
      : bottom === 'footer'
        ? FOOTER_CLEARANCE + insets.bottom
        : space.screenTop + insets.bottom;
  const padding = {
    paddingTop: (topInset ? insets.top : 0) + space.screenTop,
    paddingBottom,
  };

  return (
    <View style={styles.root}>
      {scroll ? (
        <ScrollView
          style={styles.root}
          contentContainerStyle={[styles.content, padding, contentStyle]}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, styles.content, padding, contentStyle]}>{children}</View>
      )}
      {footer}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: space.gutter,
    gap: space.sectionGap,
  },
});
