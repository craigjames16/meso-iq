/**
 * Chart utility functions for data processing
 * Used by Victory Native chart components
 */

export interface MuscleGroupData {
  [muscleGroup: string]: Array<Record<string, { volume?: number; count?: number; date: string }>>;
}

export interface ChartDataPoint {
  instanceId: string;
  date: string;
  shortDate: string;
  volume: number;
  sets: number;
  volumeAvg: number;
  setsAvg: number;
}

/**
 * Process raw data into chart-ready format with rolling averages
 */
export const processChartData = (
  volumeInstances: any[],
  setInstances: any[]
): ChartDataPoint[] => {
  const dataMap = new Map<string, { date: string; volume: number; sets: number }>();

  // Process Volume
  volumeInstances.forEach(inst => {
    const [id, data] = Object.entries(inst)[0] as [string, { volume: number; date: string }];
    if (!dataMap.has(id)) {
      dataMap.set(id, { date: data.date, volume: 0, sets: 0 });
    }
    dataMap.get(id)!.volume = data.volume;
  });

  // Process Sets
  setInstances.forEach(inst => {
    const [id, data] = Object.entries(inst)[0] as [string, { count: number; date: string }];
    if (!dataMap.has(id)) {
      dataMap.set(id, { date: data.date, volume: 0, sets: 0 });
    }
    dataMap.get(id)!.sets = data.count;
  });

  // Sort by date
  const sortedData = Array.from(dataMap.entries())
    .map(([id, data]) => ({ instanceId: id, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate rolling averages (last 7 data points)
  const ROLLING_WINDOW = 7;
  
  return sortedData.map((item, index) => {
    const startIdx = Math.max(0, index - ROLLING_WINDOW + 1);
    const window = sortedData.slice(startIdx, index + 1);
    
    const volumeAvg = window.reduce((sum, curr) => sum + curr.volume, 0) / window.length;
    const setsAvg = window.reduce((sum, curr) => sum + curr.sets, 0) / window.length;

    return {
      ...item,
      shortDate: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      volumeAvg: Math.round(volumeAvg),
      setsAvg: Math.round(setsAvg * 10) / 10,
    };
  });
};

/**
 * Calculate total volume for a muscle group from instances
 */
export const calculateTotalVolume = (instances: any[]): number => {
  if (!instances || !Array.isArray(instances) || instances.length === 0) return 0;
  
  return instances.reduce((total, instance) => {
    const entry = Object.values(instance)[0] as { volume?: number };
    return total + (entry?.volume ?? 0);
  }, 0);
};

/**
 * Calculate total sets for a muscle group from instances
 */
export const calculateTotalSets = (instances: any[]): number => {
  if (!instances || !Array.isArray(instances) || instances.length === 0) return 0;
  
  return instances.reduce((total, instance) => {
    const entry = Object.values(instance)[0] as { count?: number };
    return total + (entry?.count ?? 0);
  }, 0);
};
