import { Asset, AssetKpiPoint, KpiId, EntropyBandId } from '@/data/mockData';

export interface RawTransaction {
  buy_date: string;
  sell_date: string;
  purchase_price: number;
  selling_price: number;
  buy_nav: number;
  sell_nav: number;
  profit: number;
}

export interface DailyChange {
  date: string;
  nav: number;
  change: number | null;
  change_percent: number | null;
}

export interface RawAssetData {
  asset: string;
  volatility: number;
  interest_rate: number | string;
  purchase_price: number;
  total_profit: number;
  transactions_detail: RawTransaction[];
  daily_changes: DailyChange[];
}

interface AssetClassification {
  categoryPath: string[];
  isLiquid: boolean;
  defaultEntropy?: number;
}

function classifyAsset(assetName: string, volatility: number, hasInterestRate: boolean): AssetClassification {
  const name = assetName.toLowerCase();
  
  // Cash & Deposits (cold)
  if (name.includes('cash') || name.includes('account -') || name.includes('eur cash')) {
    return { categoryPath: ['Liquid assets', 'Cash'], isLiquid: true, defaultEntropy: 5 };
  }
  
  // Bonds & Fixed Income (cold-mild)
  if (hasInterestRate || name.match(/\d{1,2}\/\d{2}\/\d{2}/) || name.includes('bond')) {
    return { categoryPath: ['Liquid assets', 'Fixed Income'], isLiquid: true, defaultEntropy: 15 };
  }
  
  // Private Equity & VC (hot-very_hot)
  if (name.includes('pe ') || name.includes('private equity') || name.includes('vc fund') || 
      name.includes('venture') || name.includes('carlyle') || name.includes('ardian') ||
      name.includes('ballington') || name.includes('alpha one')) {
    return { categoryPath: ['Illiquid assets', 'Private Equity'], isLiquid: false, defaultEntropy: 70 };
  }
  
  // Real Estate (warm)
  if (name.includes('properties') || name.includes('place') || name.includes('real estate') ||
      name.includes('property') || name.includes('building')) {
    return { categoryPath: ['Illiquid assets', 'Real Estate'], isLiquid: false, defaultEntropy: 50 };
  }
  
  // Infrastructure (warm)
  if (name.includes('windpark') || name.includes('solar') || name.includes('infrastructure')) {
    return { categoryPath: ['Illiquid assets', 'Infrastructure'], isLiquid: false, defaultEntropy: 48 };
  }
  
  // Options & Derivatives (hot-very_hot)
  if (name.includes('call') || name.includes('put') || name.includes('option')) {
    return { categoryPath: ['Liquid assets', 'Derivatives'], isLiquid: true, defaultEntropy: 75 };
  }
  
  // Art & Collectibles (very_hot)
  if (name.includes('art') || name.includes('ferrari') || name.includes('collection')) {
    return { categoryPath: ['Illiquid assets', 'Alternative'], isLiquid: false, defaultEntropy: 90 };
  }
  
  // Loans (mild)
  if (name.includes('loan') || name.includes('financing') || name.includes('receivable')) {
    return { categoryPath: ['Liquid assets', 'Fixed Income'], isLiquid: true, defaultEntropy: 20 };
  }
  
  // Accruals and Other Liabilities
  if (name.includes('accrual') || name.includes('payable')) {
    return { categoryPath: ['Other', 'Accruals'], isLiquid: true, defaultEntropy: 5 };
  }
  
  // Known public companies (mild-hot based on volatility)
  const publicEquities = [
    'microsoft', 'alphabet', 'google', 'apple', 'amazon', 'meta', 'facebook',
    'tesla', 'nvidia', 'alibaba', 'tencent', 'netflix', 'adobe',
    'nestle', 'unilever', 'procter', 'coca-cola', 'pepsico',
    'jpmorgan', 'bank of america', 'wells fargo', 'citigroup', 'nova scotia',
    'exxon', 'chevron', 'shell', 'bp',
    'pfizer', 'johnson', 'merck', 'abbvie',
    'walmart', 'target', 'costco', 'home depot',
    'boeing', 'airbus', 'lockheed', 'raytheon',
    'adidas', 'nike', 'puma',
    'volkswagen', 'toyota', 'ford', 'gm',
    'basf', 'dow', 'dupont',
    'siemens', 'ge ', 'honeywell',
    'disney', 'comcast', 'at&t', 'verizon',
    'anheuser-busch', 'diageo', 'heineken',
    'accesso', 'total', 'eni'
  ];
  
  if (publicEquities.some(company => name.includes(company))) {
    return { categoryPath: ['Liquid assets', 'Equities'], isLiquid: true };
  }
  
  // Default: public equity
  return { categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, defaultEntropy: 40 };
}

function calculateEntropyScore(volatility: number, classification: AssetClassification): number {
  // If volatility is 0 or very low, use default entropy from classification
  if (volatility < 0.001 && classification.defaultEntropy !== undefined) {
    return classification.defaultEntropy;
  }
  
  // Map volatility (0-1) to entropy score (0-100)
  // Amplify for better distribution
  let score = Math.min(100, Math.round(volatility * 200));
  
  // Apply category-based adjustments
  if (classification.categoryPath.includes('Private Equity')) {
    score = Math.max(score, 65); // PE is always at least hot
  } else if (classification.categoryPath.includes('Cash')) {
    score = Math.min(score, 15); // Cash is always cold
  } else if (classification.categoryPath.includes('Fixed Income')) {
    score = Math.min(score, 40); // Bonds are mild at most
  }
  
  return score;
}

function getEntropyBand(score: number): EntropyBandId {
  if (score < 20) return 'cold';
  if (score < 40) return 'mild';
  if (score < 60) return 'warm';
  if (score < 80) return 'hot';
  return 'very_hot';
}

function generateDailyDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set to start of day
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    const day = current.getDate().toString().padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

function createNavMap(dailyChanges: DailyChange[]): Map<string, number> {
  // Create a map of date -> NAV for fast lookup
  const navMap = new Map<string, number>();
  let lastNav = 0;
  
  // Sort by date and create map, carrying forward last known NAV
  const sorted = [...dailyChanges].sort((a, b) => a.date.localeCompare(b.date));
  
  sorted.forEach(change => {
    lastNav = change.nav;
    navMap.set(change.date, change.nav);
  });
  
  return navMap;
}

function getNavForDate(navMap: Map<string, number>, targetDate: string): number {
  // Try exact match first
  if (navMap.has(targetDate)) {
    return navMap.get(targetDate)!;
  }
  
  // Find the most recent NAV value before the target date
  const target = new Date(targetDate);
  let lastNav = 0;
  let lastDate = new Date(0);
  
  navMap.forEach((nav, dateStr) => {
    const changeDate = new Date(dateStr);
    if (changeDate <= target && changeDate >= lastDate) {
      lastNav = nav;
      lastDate = changeDate;
    }
  });
  
  return lastNav;
}

export function transformClientData(rawData: RawAssetData[]): {
  assets: Asset[];
  kpiData: AssetKpiPoint[];
  monthlyDates: string[]; // Keep name for compatibility, but now contains daily dates
} {
  console.log('🔄 Starting transformation of', rawData.length, 'raw data entries');
  
  // Filter to only show data from 2019 onwards
  const minDate = '2019-01-01';
  const minDateObj = new Date(minDate);
  minDateObj.setHours(0, 0, 0, 0);
  
  // Cap latest date to today
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const latestDate = now.toISOString().split('T')[0];
  
  // Deduplicate by asset name and merge daily_changes
  const assetMap = new Map<string, {
    volatility: number;
    interestRate: number | string;
    totalProfit: number;
    transactions: RawTransaction[];
    dailyChanges: DailyChange[];
  }>();
  
  // Optimize: Pre-filter daily_changes more efficiently
  rawData.forEach(item => {
    const dailyChanges = item.daily_changes || [];
    
    // Quick filter: string comparison is faster than Date object creation
    // Only create Date objects for dates that pass the string check
    const filteredDailyChanges: DailyChange[] = [];
    for (let i = 0; i < dailyChanges.length; i++) {
      const dc = dailyChanges[i];
      // String comparison first (much faster)
      if (dc.date >= minDate && dc.date <= latestDate) {
        filteredDailyChanges.push(dc);
      }
    }
    
    // Skip assets with no daily data from 2019 onwards
    if (filteredDailyChanges.length === 0) {
      return;
    }
    
    const existing = assetMap.get(item.asset);
    if (existing) {
      // Merge daily changes, keeping the most recent value for each date
      const dateMap = new Map<string, DailyChange>();
      existing.dailyChanges.forEach(dc => dateMap.set(dc.date, dc));
      filteredDailyChanges.forEach(dc => dateMap.set(dc.date, dc));
      existing.dailyChanges = Array.from(dateMap.values()).sort((a, b) => 
        a.date.localeCompare(b.date)
      );
      existing.transactions.push(...item.transactions_detail);
    } else {
      assetMap.set(item.asset, {
        volatility: item.volatility,
        interestRate: item.interest_rate,
        totalProfit: item.total_profit,
        transactions: [...item.transactions_detail],
        dailyChanges: filteredDailyChanges.sort((a, b) => a.date.localeCompare(b.date))
      });
    }
  });
  
  console.log('📋 Unique assets after deduplication and filtering:', assetMap.size);
  
  // Collect all unique dates from all assets' daily changes
  const allDatesSet = new Set<string>();
  assetMap.forEach(data => {
    data.dailyChanges.forEach(dc => {
      if (dc.date >= minDate && dc.date <= latestDate) {
        allDatesSet.add(dc.date);
      }
    });
  });
  
  // Generate sorted daily dates array
  let dailyDates = Array.from(allDatesSet).sort();
  
  // Sample dates to improve performance - show every Nth day instead of every day
  // This reduces data points significantly while maintaining good granularity
  // With ~2500 days from 2019-2025, sampling every 3rd day gives ~833 days (66% reduction)
  const SAMPLE_INTERVAL = 3; // Show every 3rd day (can be adjusted: 1=every day, 2=every other day, 3=every 3rd day, etc.)
  if (SAMPLE_INTERVAL > 1 && dailyDates.length > 1000) {
    const originalLength = dailyDates.length;
    dailyDates = dailyDates.filter((_, index) => index % SAMPLE_INTERVAL === 0);
    console.log(`📊 Sampling dates: ${originalLength} → ${dailyDates.length} days (every ${SAMPLE_INTERVAL} days)`);
  }
  
  console.log('📅 Daily dates range:', dailyDates[0], 'to', dailyDates[dailyDates.length - 1], `(${dailyDates.length} days)`);
  
  // Generate assets with classification
  const assets: Asset[] = [];
  let assetIdCounter = 1;
  
  assetMap.forEach((data, assetName) => {
    const hasInterestRate = typeof data.interestRate === 'number' && data.interestRate > 0;
    const classification = classifyAsset(assetName, data.volatility, hasInterestRate);
    const entropyScore = calculateEntropyScore(data.volatility, classification);
    const entropyBand = getEntropyBand(entropyScore);
    
    assets.push({
      id: `a${assetIdCounter++}`,
      name: assetName,
      categoryPath: classification.categoryPath,
      isLiquid: classification.isLiquid,
      entropyBand,
      entropyScore
    });
  });
  
  // Generate KPI data using actual daily NAV values
  const kpiData: AssetKpiPoint[] = [];
  const kpis: KpiId[] = ['nav', 'pl', 'twr', 'quoted_alloc', 'cf'];
  
  // Track initial NAV for each asset (first NAV value from 2019)
  const assetInitialNav = new Map<string, number>();
  const assetNavMaps = new Map<string, Map<string, number>>();
  
  assets.forEach(asset => {
    const rawAsset = assetMap.get(asset.name)!;
    
    // Create NAV map for fast lookup
    const navMap = createNavMap(rawAsset.dailyChanges);
    assetNavMaps.set(asset.id, navMap);
    
    // Find initial NAV (first NAV value from 2019)
    if (rawAsset.dailyChanges.length > 0) {
      const firstNav = rawAsset.dailyChanges[0].nav;
      assetInitialNav.set(asset.id, firstNav);
    }
  });
  
  // Optimize: Only generate KPI data for assets that have data on the sampled dates
  assets.forEach(asset => {
    const rawAsset = assetMap.get(asset.name)!;
    const navMap = assetNavMaps.get(asset.id)!;
    const initialNav = assetInitialNav.get(asset.id) || 0;
    
    // Pre-calculate values that don't change per date
    const totalProfit = rawAsset.totalProfit;
    
    dailyDates.forEach((date, idx) => {
      // Get NAV for this date from daily_changes
      const nav = getNavForDate(navMap, date);
      
      // Calculate all KPIs for this date (pre-calculate to avoid repeated calculations)
      const pl = nav - initialNav;
      const twr = initialNav > 0 ? ((nav / initialNav - 1) * 100) : 0;
      const progress = idx / dailyDates.length;
      const cf = totalProfit * progress;
      const navValue = Math.max(0, nav);
      
      // Push all KPIs at once (more efficient than individual pushes)
      kpiData.push(
        { date, assetId: asset.id, kpi: 'nav', value: navValue },
        { date, assetId: asset.id, kpi: 'pl', value: pl },
        { date, assetId: asset.id, kpi: 'twr', value: twr },
        { date, assetId: asset.id, kpi: 'quoted_alloc', value: navValue },
        { date, assetId: asset.id, kpi: 'cf', value: cf }
      );
    });
  });
  
  console.log('✅ Transformation complete:', {
    assets: assets.length,
    kpiDataPoints: kpiData.length,
    dateRange: `${dailyDates[0]} to ${dailyDates[dailyDates.length - 1]}`
  });
  
  return {
    assets,
    kpiData,
    monthlyDates: dailyDates // Using daily dates but keeping the name for compatibility
  };
}
