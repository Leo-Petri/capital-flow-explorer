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

export function getBandStats(
  band: VolatilityBandId,
  assets: Asset[],
  kpiData: AssetKpiPoint[],
  kpi: KpiId,
  currentDate: string
) {
  const bandAssets = getAssetsInBand(assets, band);
  
  // Early return if no current date or no assets
  if (!currentDate || bandAssets.length === 0) {
    return {
      currentValue: 0,
      avgVolatility: 0,
      assetCount: bandAssets.length,
    };
  }
  
  // Create a Map for O(1) lookups: key = assetId
  // Always use 'nav' KPI for Current Value (sum of all current NAVs)
  const navMap = new Map<string, number>();
  let navDataPointsFound = 0;
  
  // First, try exact date match
  kpiData.forEach(point => {
    if (point.kpi === 'nav' && point.date === currentDate) {
      navMap.set(point.assetId, point.value);
      navDataPointsFound++;
    }
  });
  
  // If no exact match found, try to find the closest date (most recent <= currentDate)
  if (navDataPointsFound === 0 && currentDate) {
    const navDataByAsset = new Map<string, { date: string; value: number }>();
    kpiData.forEach(point => {
      if (point.kpi === 'nav' && point.date <= currentDate) {
        const existing = navDataByAsset.get(point.assetId);
        if (!existing || point.date > existing.date) {
          navDataByAsset.set(point.assetId, { date: point.date, value: point.value });
        }
      }
    });
    
    // Use the closest dates found
    navDataByAsset.forEach((data, assetId) => {
      navMap.set(assetId, data.value);
      navDataPointsFound++;
    });
  }
  
  // Use Map lookup instead of find() for O(1) access
  // Current Value = sum of all current NAVs from assets under this volatility group
  let matchedAssets = 0;
  const currentValue = bandAssets.reduce((sum, asset) => {
    const nav = navMap.get(asset.id);
    if (nav !== undefined) {
      matchedAssets++;
      return sum + nav;
    }
    return sum;
  }, 0);
  
  // Enhanced debug logging for warm band
  if (band === 'warm') {
    const totalNavDataForDate = kpiData.filter(p => p.kpi === 'nav' && p.date === currentDate).length;
    const sampleDates = Array.from(new Set(kpiData.filter(p => p.kpi === 'nav').map(p => p.date))).slice(0, 5);
    
    console.log('🔍 Debug getBandStats for warm band:', {
      band,
      currentDate,
      bandAssetsCount: bandAssets.length,
      navDataPointsFound,
      matchedAssets,
      currentValue,
      assetIds: bandAssets.map(a => a.id).slice(0, 5),
      assetNames: bandAssets.map(a => a.name).slice(0, 5),
      sampleNavData: Array.from(navMap.entries()).slice(0, 5),
      totalNavDataForDate,
      sampleDatesInKpiData: sampleDates,
      dateMatch: kpiData.some(p => p.kpi === 'nav' && p.date === currentDate),
      // Check if any warm band assets have NAV data at all
      warmAssetsWithNavData: bandAssets.filter(a => 
        kpiData.some(p => p.kpi === 'nav' && p.assetId === a.id)
      ).length,
    });
  }
  
  // Avg Volatility = average of volatility scores for all assets in the band
  const avgVolatility = bandAssets.length > 0
    ? bandAssets.reduce((sum, a) => sum + a.volatilityScore, 0) / bandAssets.length
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
    description: 'Minimal volatility: cash, deposits, ultra-stable instruments with near-zero volatility.',
    range: '0-20',
  },
  mild: {
    name: 'Mild',
    description: 'Low volatility: investment-grade bonds, defensive equities with stable cash flows.',
    range: '20-40',
  },
  warm: {
    name: 'Warm',
    description: 'Medium volatility: diversified equity funds, stable real assets with moderate volatility.',
    range: '40-60',
  },
  hot: {
    name: 'Hot',
    description: 'High volatility: growth stocks, private equity, derivative strategies with elevated uncertainty.',
    range: '60-80',
  },
  very_hot: {
    name: 'Very Hot',
    description: 'Extreme volatility: crypto, frontier markets, highly speculative assets with maximum volatility.',
    range: '80-100',
  },
};
