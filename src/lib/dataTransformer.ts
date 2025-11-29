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

export interface RawAssetData {
  asset: string;
  volatility: number;
  interest_rate: number | string;
  purchase_price: number;
  total_profit: number;
  transactions_detail: RawTransaction[];
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

function generateMonthlyDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = (current.getMonth() + 1).toString().padStart(2, '0');
    dates.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }
  
  return dates;
}

function interpolateValue(
  buyDate: string,
  sellDate: string,
  buyNav: number,
  sellNav: number,
  targetDate: string
): number {
  const buy = new Date(buyDate);
  const sell = new Date(sellDate);
  const target = new Date(targetDate + '-01');
  
  // Before purchase
  if (target < buy) return 0;
  
  // After sale
  if (target > sell) return 0;
  
  // Linear interpolation
  const totalTime = sell.getTime() - buy.getTime();
  const elapsedTime = target.getTime() - buy.getTime();
  const ratio = elapsedTime / totalTime;
  
  return buyNav + (sellNav - buyNav) * ratio;
}

export function transformClientData(rawData: RawAssetData[]): {
  assets: Asset[];
  kpiData: AssetKpiPoint[];
  monthlyDates: string[];
} {
  console.log('🔄 Starting transformation of', rawData.length, 'raw data entries');
  
  // Deduplicate by asset name and merge transactions
  const assetMap = new Map<string, {
    volatility: number;
    interestRate: number | string;
    totalProfit: number;
    transactions: RawTransaction[];
  }>();
  
  rawData.forEach(item => {
    const existing = assetMap.get(item.asset);
    if (existing) {
      existing.transactions.push(...item.transactions_detail);
    } else {
      assetMap.set(item.asset, {
        volatility: item.volatility,
        interestRate: item.interest_rate,
        totalProfit: item.total_profit,
        transactions: [...item.transactions_detail]
      });
    }
  });
  
  console.log('📋 Unique assets after deduplication:', assetMap.size);
  
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
  
  // Find date range from all transactions
  let earliestDate = '2019-01-01';
  
  // Cap latest date to current month
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  let latestDate = currentYearMonth;
  
  assetMap.forEach(data => {
    data.transactions.forEach(tx => {
      if (tx.buy_date < earliestDate) earliestDate = tx.buy_date;
      // Only consider sell dates up to today
      if (tx.sell_date > latestDate && tx.sell_date <= currentYearMonth) {
        latestDate = tx.sell_date;
      }
    });
  });
  
  // Generate monthly dates (up to current month)
  const monthlyDates = generateMonthlyDates(earliestDate, latestDate);
  
  // Generate KPI data
  const kpiData: AssetKpiPoint[] = [];
  const kpis: KpiId[] = ['nav', 'pl', 'twr', 'quoted_alloc', 'cf'];
  
  assets.forEach(asset => {
    const rawAsset = assetMap.get(asset.name)!;
    
    monthlyDates.forEach((date, idx) => {
      // Calculate NAV by summing all active transactions at this date
      let totalNav = 0;
      let totalInitialNav = 0;
      
      rawAsset.transactions.forEach(tx => {
        const nav = interpolateValue(tx.buy_date, tx.sell_date, tx.buy_nav, tx.sell_nav, date);
        totalNav += nav;
        if (nav > 0) totalInitialNav += tx.buy_nav;
      });
      
      kpis.forEach(kpi => {
        let value = 0;
        
        if (kpi === 'nav') {
          value = totalNav;
        } else if (kpi === 'pl') {
          // Unrealized P/L
          value = totalNav - totalInitialNav;
        } else if (kpi === 'twr') {
          // Time-weighted return (%)
          value = totalInitialNav > 0 ? ((totalNav / totalInitialNav - 1) * 100) : 0;
        } else if (kpi === 'quoted_alloc') {
          // Will be calculated as % later
          value = totalNav;
        } else if (kpi === 'cf') {
          // Cash flow (simplified: just profit distributed over time)
          const monthProgress = idx / monthlyDates.length;
          value = rawAsset.totalProfit * monthProgress;
        }
        
        kpiData.push({
          date,
          assetId: asset.id,
          kpi,
          value: Math.max(0, value)
        });
      });
    });
  });
  
  return {
    assets,
    kpiData,
    monthlyDates
  };
}
