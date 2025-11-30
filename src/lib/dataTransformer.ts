import { Asset, AssetKpiPoint, KpiId, VolatilityBandId } from '@/data/mockData';

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
  defaultVolatility?: number;
}

function classifyAsset(assetName: string, volatility: number, hasInterestRate: boolean): AssetClassification {
  const name = assetName.toLowerCase();
  
  // Cash & Deposits (cold)
  if (name.includes('cash') || name.includes('account -') || name.includes('eur cash')) {
    return { categoryPath: ['Liquid assets', 'Cash'], isLiquid: true, defaultVolatility: 5 };
  }
  
  // Bonds & Fixed Income (cold-mild)
  if (hasInterestRate || name.match(/\d{1,2}\/\d{2}\/\d{2}/) || name.includes('bond')) {
    return { categoryPath: ['Liquid assets', 'Fixed Income'], isLiquid: true, defaultVolatility: 15 };
  }
  
  // Private Equity & VC (hot-very_hot)
  if (name.includes('pe ') || name.includes('private equity') || name.includes('vc fund') || 
      name.includes('venture') || name.includes('carlyle') || name.includes('ardian') ||
      name.includes('ballington') || name.includes('alpha one')) {
    return { categoryPath: ['Illiquid assets', 'Private Equity'], isLiquid: false, defaultVolatility: 70 };
  }
  
  // Real Estate (warm)
  if (name.includes('properties') || name.includes('place') || name.includes('real estate') ||
      name.includes('property') || name.includes('building')) {
    return { categoryPath: ['Illiquid assets', 'Real Estate'], isLiquid: false, defaultVolatility: 50 };
  }
  
  // Infrastructure (warm)
  if (name.includes('windpark') || name.includes('solar') || name.includes('infrastructure')) {
    return { categoryPath: ['Illiquid assets', 'Infrastructure'], isLiquid: false, defaultVolatility: 48 };
  }
  
  // Options & Derivatives (hot-very_hot)
  if (name.includes('call') || name.includes('put') || name.includes('option')) {
    return { categoryPath: ['Liquid assets', 'Derivatives'], isLiquid: true, defaultVolatility: 75 };
  }
  
  // Art & Collectibles (very_hot)
  if (name.includes('art') || name.includes('ferrari') || name.includes('collection')) {
    return { categoryPath: ['Illiquid assets', 'Alternative'], isLiquid: false, defaultVolatility: 90 };
  }
  
  // Loans (mild)
  if (name.includes('loan') || name.includes('financing') || name.includes('receivable')) {
    return { categoryPath: ['Liquid assets', 'Fixed Income'], isLiquid: true, defaultVolatility: 20 };
  }
  
  // Accruals and Other Liabilities
  if (name.includes('accrual') || name.includes('payable')) {
    return { categoryPath: ['Other', 'Accruals'], isLiquid: true, defaultVolatility: 5 };
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
  return { categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, defaultVolatility: 40 };
}

/**
 * Calculate percentile thresholds from volatility distribution
 * Returns volatility values at 20th, 40th, 60th, and 80th percentiles
 */
function calculateVolatilityPercentiles(volatilities: number[]): {
  p20: number;
  p40: number;
  p60: number;
  p80: number;
} {
  if (volatilities.length === 0) {
    return { p20: 0, p40: 0, p60: 0, p80: 0 };
  }
  
  const sorted = [...volatilities].sort((a, b) => a - b);
  
  return {
    p20: sorted[Math.floor(sorted.length * 0.2)] || 0,
    p40: sorted[Math.floor(sorted.length * 0.4)] || 0,
    p60: sorted[Math.floor(sorted.length * 0.6)] || 0,
    p80: sorted[Math.floor(sorted.length * 0.8)] || 0,
  };
}

/**
 * Calculate volatility score and band based on volatility percentiles
 * Uses percentile-based clustering to ensure balanced distribution
 */
function calculateVolatilityFromPercentiles(
  volatility: number,
  percentiles: ReturnType<typeof calculateVolatilityPercentiles>,
  classification: AssetClassification
): { score: number; band: VolatilityBandId } {
  // Determine which percentile range the volatility falls into
  let band: VolatilityBandId;
  let baseScore: number;
  
  if (volatility <= percentiles.p20) {
    band = 'cold';
    // Map to 0-20 range: linear interpolation within cold band
    const ratio = percentiles.p20 > 0 ? volatility / percentiles.p20 : 0;
    baseScore = Math.round(ratio * 20);
  } else if (volatility <= percentiles.p40) {
    band = 'mild';
    // Map to 20-40 range
    const ratio = percentiles.p40 > percentiles.p20 
      ? (volatility - percentiles.p20) / (percentiles.p40 - percentiles.p20)
      : 0.5;
    baseScore = Math.round(20 + ratio * 20);
  } else if (volatility <= percentiles.p60) {
    band = 'warm';
    // Map to 40-60 range
    const ratio = percentiles.p60 > percentiles.p40
      ? (volatility - percentiles.p40) / (percentiles.p60 - percentiles.p40)
      : 0.5;
    baseScore = Math.round(40 + ratio * 20);
  } else if (volatility <= percentiles.p80) {
    band = 'hot';
    // Map to 60-80 range
    const ratio = percentiles.p80 > percentiles.p60
      ? (volatility - percentiles.p60) / (percentiles.p80 - percentiles.p60)
      : 0.5;
    baseScore = Math.round(60 + ratio * 20);
  } else {
    band = 'very_hot';
    // Map to 80-100 range
    // For very_hot, we need max volatility to map to 100
    // Use a reasonable max (e.g., 2x the 80th percentile or 1.0, whichever is smaller)
    const maxVol = Math.min(1.0, percentiles.p80 * 2 || 1.0);
    const ratio = maxVol > percentiles.p80
      ? (volatility - percentiles.p80) / (maxVol - percentiles.p80)
      : 1.0;
    baseScore = Math.round(80 + Math.min(ratio, 1.0) * 20);
  }
  
  // Apply soft category-based adjustments (not hard overrides)
  let adjustedScore = baseScore;
  
  if (classification.categoryPath.includes('Cash')) {
    // Cash should be in cold band, but allow slight adjustment
    adjustedScore = Math.min(adjustedScore, 15);
    band = 'cold';
  } else if (classification.categoryPath.includes('Fixed Income')) {
    // Fixed income tends to be lower volatility
    adjustedScore = Math.min(adjustedScore, 45);
    if (adjustedScore > 40) band = 'warm';
    else if (adjustedScore > 20) band = 'mild';
    else band = 'cold';
  } else if (classification.categoryPath.includes('Private Equity')) {
    // PE tends to be higher volatility
    adjustedScore = Math.max(adjustedScore, 65);
    if (adjustedScore < 80) band = 'hot';
    else band = 'very_hot';
  }
  
  // Ensure score is within valid range
  adjustedScore = Math.max(0, Math.min(100, adjustedScore));
  
  // Recalculate band if score was adjusted significantly
  if (adjustedScore < 20) band = 'cold';
  else if (adjustedScore < 40) band = 'mild';
  else if (adjustedScore < 60) band = 'warm';
  else if (adjustedScore < 80) band = 'hot';
  else band = 'very_hot';
  
  return { score: adjustedScore, band };
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

interface NavMapData {
  map: Map<string, number>;
  sortedDates: string[];
}

function createNavMap(dailyChanges: DailyChange[]): NavMapData {
  // Create a map of date -> NAV for fast lookup
  const navMap = new Map<string, number>();
  
  // Sort by date and create map
  const sorted = [...dailyChanges].sort((a, b) => a.date.localeCompare(b.date));
  
  sorted.forEach(change => {
    navMap.set(change.date, change.nav);
  });
  
  // Return both map and sorted dates array for binary search
  return {
    map: navMap,
    sortedDates: sorted.map(c => c.date)
  };
}

function getNavForDate(navMapData: NavMapData, targetDate: string): number {
  // Try exact match first (O(1))
  if (navMapData.map.has(targetDate)) {
    return navMapData.map.get(targetDate)!;
  }
  
  // Binary search for the most recent NAV value before the target date (O(log n))
  const sortedDates = navMapData.sortedDates;
  let left = 0;
  let right = sortedDates.length - 1;
  let result = -1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (sortedDates[mid] <= targetDate) {
      result = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  // If we found a date <= targetDate, return its NAV
  if (result >= 0) {
    return navMapData.map.get(sortedDates[result]) || 0;
  }
  
  return 0;
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
    purchasePrice: number;
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
    
    // Include assets even if they have no daily data from 2019+, as long as they have transactions_detail
    // This ensures assets like "Moha Solar Park" with sparse data are still included
    const hasTransactions = item.transactions_detail && item.transactions_detail.length > 0;
    const hasDailyData = filteredDailyChanges.length > 0;
    
    // Skip only if asset has neither transactions nor daily data from 2019+
    if (!hasDailyData && !hasTransactions) {
      return;
    }
    
    const existing = assetMap.get(item.asset);
    if (existing) {
      // Merge daily changes, keeping the most recent value for each date
      if (hasDailyData) {
        const dateMap = new Map<string, DailyChange>();
        existing.dailyChanges.forEach(dc => dateMap.set(dc.date, dc));
        filteredDailyChanges.forEach(dc => dateMap.set(dc.date, dc));
        existing.dailyChanges = Array.from(dateMap.values()).sort((a, b) => 
          a.date.localeCompare(b.date)
        );
      }
      // Always merge transactions (deduplicate by buy_date + sell_date)
      const transactionMap = new Map<string, RawTransaction>();
      existing.transactions.forEach(txn => {
        const key = `${txn.buy_date}_${txn.sell_date}`;
        transactionMap.set(key, txn);
      });
      item.transactions_detail.forEach(txn => {
        const key = `${txn.buy_date}_${txn.sell_date}`;
        transactionMap.set(key, txn);
      });
      existing.transactions = Array.from(transactionMap.values());
      // Update purchase price if not set or use the latest one
      if (!existing.purchasePrice || item.purchase_price) {
        existing.purchasePrice = item.purchase_price;
      }
      // Update total profit (use the latest one, as each entry represents the asset's total profit)
      if (item.total_profit !== undefined && item.total_profit !== null) {
        existing.totalProfit = item.total_profit;
      }
    } else {
      assetMap.set(item.asset, {
        volatility: item.volatility,
        interestRate: item.interest_rate,
        purchasePrice: item.purchase_price,
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
  const SAMPLE_INTERVAL = 1; // Show every day (can be adjusted: 1=every day, 2=every other day, 3=every 3rd day, etc.)
  if (SAMPLE_INTERVAL > 1 && dailyDates.length > 1000) {
    const originalLength = dailyDates.length;
    dailyDates = dailyDates.filter((_, index) => index % SAMPLE_INTERVAL === 0);
    console.log(`📊 Sampling dates: ${originalLength} → ${dailyDates.length} days (every ${SAMPLE_INTERVAL} days)`);
  }
  
  console.log('📅 Daily dates range:', dailyDates[0], 'to', dailyDates[dailyDates.length - 1], `(${dailyDates.length} days)`);
  
  // Step 1: First classify all assets to get their categories
  const assetClassifications = new Map<string, AssetClassification>();
  assetMap.forEach((data, assetName) => {
    const hasInterestRate = typeof data.interestRate === 'number' && data.interestRate > 0;
    const classification = classifyAsset(assetName, data.volatility, hasInterestRate);
    assetClassifications.set(assetName, classification);
  });

  // Step 2: Group assets by asset class (second level of categoryPath)
  const assetsByClass = new Map<string, { assetName: string; volatility: number }[]>();
  assetMap.forEach((data, assetName) => {
    const classification = assetClassifications.get(assetName)!;
    // Use second level of categoryPath (e.g., 'Cash', 'Equities', 'Private Equity')
    // Fallback to first level if second doesn't exist
    const assetClass = classification.categoryPath.length > 1 
      ? classification.categoryPath[1] 
      : classification.categoryPath[0];
    
    if (!assetsByClass.has(assetClass)) {
      assetsByClass.set(assetClass, []);
    }
    assetsByClass.get(assetClass)!.push({ assetName, volatility: data.volatility });
  });

  // Step 3: Calculate percentiles per asset class
  const percentilesByClass = new Map<string, ReturnType<typeof calculateVolatilityPercentiles>>();
  assetsByClass.forEach((assets, assetClass) => {
    const volatilities = assets.map(a => a.volatility);
    if (volatilities.length === 0) return;
    
    const percentiles = calculateVolatilityPercentiles(volatilities);
    percentilesByClass.set(assetClass, percentiles);
    console.log(`📊 Volatility percentiles for ${assetClass}:`, {
      count: assets.length,
      p20: percentiles.p20.toFixed(4),
      p40: percentiles.p40.toFixed(4),
      p60: percentiles.p60.toFixed(4),
      p80: percentiles.p80.toFixed(4),
      min: Math.min(...volatilities).toFixed(4),
      max: Math.max(...volatilities).toFixed(4),
    });
  });

  // Calculate global percentiles as fallback for classes with too few assets
  const allVolatilities: number[] = [];
  assetMap.forEach((d) => allVolatilities.push(d.volatility));
  const globalPercentiles = calculateVolatilityPercentiles(allVolatilities);
  console.log('📊 Global volatility percentiles (fallback):', {
    p20: globalPercentiles.p20.toFixed(4),
    p40: globalPercentiles.p40.toFixed(4),
    p60: globalPercentiles.p60.toFixed(4),
    p80: globalPercentiles.p80.toFixed(4),
    min: Math.min(...allVolatilities).toFixed(4),
    max: Math.max(...allVolatilities).toFixed(4),
  });

  // Step 4: Generate assets using asset-class-specific percentiles
  const assets: Asset[] = [];
  let assetIdCounter = 1;
  
  assetMap.forEach((data, assetName) => {
    const classification = assetClassifications.get(assetName)!;
    const assetClass = classification.categoryPath.length > 1 
      ? classification.categoryPath[1] 
      : classification.categoryPath[0];
    
    // Get class-specific percentiles, fallback to global if class has too few assets
    let classPercentiles = percentilesByClass.get(assetClass);
    
    // If class has fewer than 5 assets, use global percentiles as fallback
    if (!classPercentiles || assetsByClass.get(assetClass)!.length < 5) {
      if (assetsByClass.get(assetClass)!.length < 5) {
        console.warn(`⚠️ Asset class "${assetClass}" has only ${assetsByClass.get(assetClass)!.length} assets, using global percentiles`);
      }
      classPercentiles = globalPercentiles;
    }
    
    const { score: volatilityScore, band: volatilityBand } = calculateVolatilityFromPercentiles(
      data.volatility,
      classPercentiles,
      classification
    );
    
    assets.push({
      id: `a${assetIdCounter++}`,
      name: assetName,
      categoryPath: classification.categoryPath,
      isLiquid: classification.isLiquid,
      volatilityBand,
      volatilityScore,
      // Store raw data for detailed view
      rawVolatility: data.volatility,
      interestRate: data.interestRate,
      purchasePrice: data.purchasePrice,
      totalProfit: data.totalProfit,
      transactions: data.transactions.length > 0 ? data.transactions : undefined
    });
  });
  
  // Log volatility band distribution
  const bandCounts: Record<VolatilityBandId, number> = {
    cold: 0,
    mild: 0,
    warm: 0,
    hot: 0,
    very_hot: 0,
  };
  assets.forEach(asset => {
    bandCounts[asset.volatilityBand]++;
  });
  console.log('📈 Volatility band distribution:', bandCounts);
  
  // Generate KPI data using actual daily NAV values
  const kpiData: AssetKpiPoint[] = [];
  const kpis: KpiId[] = ['nav', 'pl', 'twr', 'quoted_alloc', 'cf'];
  
  // Track initial NAV for each asset (first NAV value from 2019)
  const assetInitialNav = new Map<string, number>();
  const assetNavMaps = new Map<string, NavMapData>();
  
  assets.forEach(asset => {
    const rawAsset = assetMap.get(asset.name)!;
    
    // Create NAV map for fast lookup (with sorted dates for binary search)
    const navMapData = createNavMap(rawAsset.dailyChanges);
    assetNavMaps.set(asset.id, navMapData);
    
    // Find initial NAV (first NAV value from 2019)
    if (rawAsset.dailyChanges.length > 0) {
      const firstNav = rawAsset.dailyChanges[0].nav;
      assetInitialNav.set(asset.id, firstNav);
    }
  });
  
  // Optimize: Only generate KPI data for assets that have data on the sampled dates
  assets.forEach(asset => {
    const rawAsset = assetMap.get(asset.name)!;
    const navMapData = assetNavMaps.get(asset.id)!;
    const initialNav = assetInitialNav.get(asset.id) || 0;
    
    // Pre-calculate values that don't change per date
    const totalProfit = rawAsset.totalProfit;
    const dateCount = dailyDates.length;
    const invDateCount = 1 / dateCount; // Pre-calculate division
    
    // Pre-allocate array for better performance (5 KPIs per date)
    const assetKpiData: AssetKpiPoint[] = [];
    assetKpiData.length = dateCount * 5;
    let kpiIndex = 0;
    
    dailyDates.forEach((date, idx) => {
      // Get NAV for this date from daily_changes (now using optimized binary search)
      const nav = getNavForDate(navMapData, date);
      
      // Calculate all KPIs for this date (pre-calculate to avoid repeated calculations)
      const navValue = Math.max(0, nav);
      const pl = nav - initialNav;
      const twr = initialNav > 0 ? ((nav / initialNav - 1) * 100) : 0;
      const progress = idx * invDateCount; // Use multiplication instead of division
      const cf = totalProfit * progress;
      
      // Push all KPIs at once (more efficient than individual pushes)
      assetKpiData[kpiIndex++] = { date, assetId: asset.id, kpi: 'nav', value: navValue };
      assetKpiData[kpiIndex++] = { date, assetId: asset.id, kpi: 'pl', value: pl };
      assetKpiData[kpiIndex++] = { date, assetId: asset.id, kpi: 'twr', value: twr };
      assetKpiData[kpiIndex++] = { date, assetId: asset.id, kpi: 'quoted_alloc', value: navValue };
      assetKpiData[kpiIndex++] = { date, assetId: asset.id, kpi: 'cf', value: cf };
    });
    
    // Add all KPIs for this asset at once
    kpiData.push(...assetKpiData);
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
