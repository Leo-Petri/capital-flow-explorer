import { Asset, AssetKpiPoint, KpiId, EntropyBandId } from '@/data/mockData';

export interface BandData {
  band: EntropyBandId;
  date: string;
  value: number;
  percentage: number;
}

export interface StackedData {
  date: string;
  cold: number;
  mild: number;
  warm: number;
  hot: number;
  very_hot: number;
  total: number;
}

export function aggregateByEntropyBand(
  assets: Asset[],
  kpiData: AssetKpiPoint[],
  kpi: KpiId,
  dates: string[]
): StackedData[] {
  const result: StackedData[] = [];
  
  dates.forEach(date => {
    const bandTotals: Record<EntropyBandId, number> = {
      cold: 0,
      mild: 0,
      warm: 0,
      hot: 0,
      very_hot: 0,
    };
    
    assets.forEach(asset => {
      const point = kpiData.find(
        p => p.date === date && p.assetId === asset.id && p.kpi === kpi
      );
      
      if (point) {
        bandTotals[asset.entropyBand] += point.value;
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

export function getAssetsInBand(assets: Asset[], band: EntropyBandId): Asset[] {
  return assets.filter(a => a.entropyBand === band);
}

export function getAssetKpiSeries(
  assetId: string,
  kpi: KpiId,
  kpiData: AssetKpiPoint[],
  dates: string[]
): { date: string; value: number }[] {
  return dates.map(date => {
    const point = kpiData.find(
      p => p.date === date && p.assetId === assetId && p.kpi === kpi
    );
    return {
      date,
      value: point?.value || 0,
    };
  });
}

export function getBandStats(
  band: EntropyBandId,
  assets: Asset[],
  kpiData: AssetKpiPoint[],
  kpi: KpiId,
  currentDate: string
) {
  const bandAssets = getAssetsInBand(assets, band);
  
  const currentValue = bandAssets.reduce((sum, asset) => {
    const point = kpiData.find(
      p => p.date === currentDate && p.assetId === asset.id && p.kpi === kpi
    );
    return sum + (point?.value || 0);
  }, 0);
  
  const avgEntropy = bandAssets.length > 0
    ? bandAssets.reduce((sum, a) => sum + a.entropyScore, 0) / bandAssets.length
    : 0;
  
  return {
    currentValue,
    avgEntropy,
    assetCount: bandAssets.length,
  };
}

export const ENTROPY_BAND_INFO: Record<EntropyBandId, { name: string; description: string; range: string }> = {
  cold: {
    name: 'Cold',
    description: 'Minimal information entropy: cash, deposits, ultra-stable instruments with near-zero volatility.',
    range: '0-20',
  },
  mild: {
    name: 'Mild',
    description: 'Low entropy: investment-grade bonds, defensive equities with stable cash flows.',
    range: '20-40',
  },
  warm: {
    name: 'Warm',
    description: 'Medium entropy: diversified equity funds, stable real assets with moderate volatility.',
    range: '40-60',
  },
  hot: {
    name: 'Hot',
    description: 'High entropy: growth stocks, private equity, derivative strategies with elevated uncertainty.',
    range: '60-80',
  },
  very_hot: {
    name: 'Very Hot',
    description: 'Extreme entropy: crypto, frontier markets, highly speculative assets with maximum volatility.',
    range: '80-100',
  },
};
