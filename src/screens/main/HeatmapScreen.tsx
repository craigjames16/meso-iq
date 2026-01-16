import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { WorkoutHeatmap } from '../../components/WorkoutHeatmap';
import { themeColors } from '../../theme/colors';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type HeatmapScreenRouteProp = {
  key: string;
  name: 'Heatmap';
  params: { mesocycleId: number | null };
};

type HeatmapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Heatmap'>;

export const HeatmapScreen: React.FC = () => {
  const route = useRoute<HeatmapScreenRouteProp>();
  const navigation = useNavigation<HeatmapScreenNavigationProp>();
  const { mesocycleId } = route.params;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <WorkoutHeatmap mesocycleId={mesocycleId} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
});

