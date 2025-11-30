import { Asset, AssetKpiPoint, KpiId, VolatilityBandId } from '@/data/mockData';

export interface StackedData {
  date: string;
  cold: number;
  mild: number;
  warm: number;
  hot: number;
  very_hot: number;
  total: number;
}

export function aggregateByVolatilityBand(
  assets: Asset[],
  kpiData: AssetKpiPoint[],
  kpi: KpiId,
  dates: string[]
): StackedData[] {
  // Create a Map for O(1) lookups: key = `${date}|${assetId}`
  // Only include data points matching the selected KPI
  const kpiMap = new Map<string, number>();
  kpiData.forEach(point => {
    if (point.kpi === kpi) {
      kpiMap.set(`${point.date}|${point.assetId}`, point.value);
    }
  });

  const result: StackedData[] = [];
  
  dates.forEach(date => {
    const bandTotals: Record<VolatilityBandId, number> = {
      cold: 0,
      mild: 0,
      warm: 0,
      hot: 0,
      very_hot: 0,
    };
    
    assets.forEach(asset => {
      const key = `${date}|${asset.id}`;
      const value = kpiMap.get(key);
      if (value !== undefined) {
        bandTotals[asset.volatilityBand] += value;
      }
    });
    
    const total = Object.values(bandTotals).reduce((sum, val) => sum + val, 0);
    
    result.push({
      date,
      ...bandTotals,
      total,
    });
  });
  
  return result;
}

export function getAssetsInBand(assets: Asset[], band: VolatilityBandId): Asset[] {
  return assets.filter(a => a.volatilityBand === band);
}

export function getAssetKpiSeries(
  assetId: string,
  kpi: KpiId,
  kpiData: AssetKpiPoint[],
  dates: string[]
): { date: string; value: number }[] {
  // Create a Map for O(1) lookups: key = date
  // Only process data points matching the asset and KPI
  const valueMap = new Map<string, number>();
  kpiData.forEach(point => {
    if (point.assetId === assetId && point.kpi === kpi) {
      valueMap.set(point.date, point.value);
    }
  });

  // Build result array with O(1) lookups instead of O(n) find operations
  return dates.map(date => ({
    date,
    value: valueMap.get(date) || 0,
  }));
}

/**
 * Get statistics for a volatility band
 * @param band - The volatility band to get stats for
 * @param assets - All assets to filter from
 * @param kpiData - KPI data (not used for currentValue calculation, kept for compatibility)
 * @param kpi - Selected KPI (not used for currentValue calculation, kept for compatibility)
 * @param currentDate - Current date (not used for currentValue calculation, kept for compatibility)
 * @returns Statistics including currentValue (sum of total profit), avgVolatility, and assetCount
 */
export function getBandStats(
  band: VolatilityBandId,
  assets: Asset[],
  kpiData: AssetKpiPoint[],
  kpi: KpiId,
  currentDate: string
) {
  const bandAssets = getAssetsInBand(assets, band);
  
  // Early return if no assets
  if (bandAssets.length === 0) {
    return {
      currentValue: 0,
      avgVolatility: 0,
      assetCount: 0,
    };
  }
  
  // Current Value = sum of all total profit for assets in this volatility group
  const currentValue = bandAssets.reduce((sum, asset) => {
    // Sum up totalProfit for each asset (default to 0 if not available)
    return sum + (asset.totalProfit || 0);
  }, 0);
  
  // Avg Volatility = average of volatility scores for all assets in the band
  const avgVolatility = bandAssets.length > 0
    ? bandAssets.reduce((sum, a) => sum + (a.rawVolatility || 0), 0) / bandAssets.length
    : 0;
  
  return {
    currentValue,
    avgVolatility,
    assetCount: bandAssets.length,
  };
}

export const VOLATILITY_BAND_INFO: Record<VolatilityBandId, { name: string; description: string; range: string }> = {
  cold: {
    name: 'Cold',
    description: 'Minimal volatility: cash, deposits, high-grade bonds, ultra-stable instruments with very low volatility.',
    range: '[0.0 - 0.1+)', // Data-driven threshold, minimum 0.1
  },
  mild: {
    name: 'Mild',
    description: 'Low volatility: investment-grade bonds, defensive equities with stable cash flows.',
    range: 'Data-driven', // Thresholds calculated from dataset distribution
  },
  warm: {
    name: 'Warm',
    description: 'Medium volatility: diversified equity funds, stable real assets with moderate volatility.',
    range: 'Data-driven', // Thresholds calculated from dataset distribution
  },
  hot: {
    name: 'Hot',
    description: 'High volatility: growth stocks, private equity, derivative strategies with elevated uncertainty.',
    range: 'Data-driven', // Thresholds calculated from dataset distribution
  },
  very_hot: {
    name: 'Very Hot',
    description: 'Extreme volatility: crypto, frontier markets, highly speculative assets with maximum volatility.',
    range: 'Data-driven', // Thresholds calculated from dataset distribution
  },
};
