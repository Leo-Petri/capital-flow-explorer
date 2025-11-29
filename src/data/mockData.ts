export type EntropyBandId = 'cold' | 'mild' | 'warm' | 'hot' | 'very_hot';

export interface Asset {
  id: string;
  name: string;
  categoryPath: string[];
  isLiquid: boolean;
  entropyBand: EntropyBandId;
  entropyScore: number;
}

export type KpiId = 'nav' | 'pl' | 'twr' | 'quoted_alloc' | 'cf';

export interface AssetKpiPoint {
  date: string;
  assetId: string;
  kpi: KpiId;
  value: number;
}

export interface Signal {
  id: string;
  date: string;
  type: 'macro' | 'geopolitical' | 'rates' | 'custom';
  title: string;
  description: string;
  importance: 'low' | 'medium' | 'high';
  imageUrl?: string;
  externalUrl?: string;
}

export interface RatePoint {
  date: string;
  rate: number;
}

// Generate monthly dates from 2019-01 to 2025-12
export function generateMonthlyDates(): string[] {
  const dates: string[] = [];
  for (let year = 2019; year <= 2025; year++) {
    for (let month = 1; month <= 12; month++) {
      dates.push(`${year}-${month.toString().padStart(2, '0')}`);
    }
  }
  return dates;
}

export const MONTHLY_DATES = generateMonthlyDates();

// Mock assets
export const ASSETS: Asset[] = [
  // Cold (0-20): cash, deposits, low-vol bonds
  { id: 'a1', name: 'Cash Reserve', categoryPath: ['Liquid assets', 'Cash'], isLiquid: true, entropyBand: 'cold', entropyScore: 5 },
  { id: 'a2', name: 'Money Market Fund', categoryPath: ['Liquid assets', 'Cash'], isLiquid: true, entropyBand: 'cold', entropyScore: 8 },
  { id: 'a3', name: 'US Treasury Bills', categoryPath: ['Liquid assets', 'Fixed Income'], isLiquid: true, entropyBand: 'cold', entropyScore: 12 },
  { id: 'a4', name: 'AAA Corp Bonds', categoryPath: ['Liquid assets', 'Fixed Income'], isLiquid: true, entropyBand: 'cold', entropyScore: 18 },

  // Mild (20-40): IG bonds, defensive equity
  { id: 'a5', name: 'IG Bond Fund', categoryPath: ['Liquid assets', 'Fixed Income'], isLiquid: true, entropyBand: 'mild', entropyScore: 25 },
  { id: 'a6', name: 'Utilities ETF', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'mild', entropyScore: 28 },
  { id: 'a7', name: 'Consumer Staples', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'mild', entropyScore: 32 },
  { id: 'a8', name: 'Dividend Aristocrats', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'mild', entropyScore: 35 },
  { id: 'a9', name: 'Healthcare Fund', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'mild', entropyScore: 38 },

  // Warm (40-60): diversified equity ETFs
  { id: 'a10', name: 'S&P 500 ETF', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'warm', entropyScore: 42 },
  { id: 'a11', name: 'MSCI World Index', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'warm', entropyScore: 45 },
  { id: 'a12', name: 'Emerging Markets', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'warm', entropyScore: 52 },
  { id: 'a13', name: 'Small Cap Fund', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'warm', entropyScore: 55 },
  { id: 'a14', name: 'Real Estate Fund', categoryPath: ['Illiquid assets', 'Real Estate'], isLiquid: false, entropyBand: 'warm', entropyScore: 48 },
  { id: 'a15', name: 'Infrastructure Fund', categoryPath: ['Illiquid assets', 'Infrastructure'], isLiquid: false, entropyBand: 'warm', entropyScore: 50 },

  // Hot (60-80): tech/growth stocks, options
  { id: 'a16', name: 'Tech Growth Fund', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'hot', entropyScore: 62 },
  { id: 'a17', name: 'NASDAQ 100', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'hot', entropyScore: 65 },
  { id: 'a18', name: 'Cloud Computing ETF', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'hot', entropyScore: 68 },
  { id: 'a19', name: 'Biotech Fund', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'hot', entropyScore: 70 },
  { id: 'a20', name: 'Options Strategy', categoryPath: ['Liquid assets', 'Derivatives'], isLiquid: true, entropyBand: 'hot', entropyScore: 72 },
  { id: 'a21', name: 'Private Equity Fund I', categoryPath: ['Illiquid assets', 'Private Equity'], isLiquid: false, entropyBand: 'hot', entropyScore: 66 },
  { id: 'a22', name: 'Private Equity Fund II', categoryPath: ['Illiquid assets', 'Private Equity'], isLiquid: false, entropyBand: 'hot', entropyScore: 69 },
  { id: 'a23', name: 'Venture Capital Fund', categoryPath: ['Illiquid assets', 'Venture Capital'], isLiquid: false, entropyBand: 'hot', entropyScore: 75 },

  // Very Hot (80-100): crypto, speculative
  { id: 'a24', name: 'Bitcoin', categoryPath: ['Liquid assets', 'Crypto'], isLiquid: true, entropyBand: 'very_hot', entropyScore: 85 },
  { id: 'a25', name: 'Ethereum', categoryPath: ['Liquid assets', 'Crypto'], isLiquid: true, entropyBand: 'very_hot', entropyScore: 88 },
  { id: 'a26', name: 'DeFi Portfolio', categoryPath: ['Liquid assets', 'Crypto'], isLiquid: true, entropyBand: 'very_hot', entropyScore: 92 },
  { id: 'a27', name: 'Frontier Markets', categoryPath: ['Liquid assets', 'Equities'], isLiquid: true, entropyBand: 'very_hot', entropyScore: 82 },
  { id: 'a28', name: 'Commodities Fund', categoryPath: ['Liquid assets', 'Commodities'], isLiquid: true, entropyBand: 'very_hot', entropyScore: 80 },
  { id: 'a29', name: 'Art Collection', categoryPath: ['Illiquid assets', 'Alternative'], isLiquid: false, entropyBand: 'very_hot', entropyScore: 90 },
  { id: 'a30', name: 'Early Stage VC', categoryPath: ['Illiquid assets', 'Venture Capital'], isLiquid: false, entropyBand: 'very_hot', entropyScore: 95 },
];

// Generate KPI data for all assets
function generateAssetKpi(asset: Asset, dates: string[]): AssetKpiPoint[] {
  const points: AssetKpiPoint[] = [];
  const kpis: KpiId[] = ['nav', 'pl', 'twr', 'quoted_alloc', 'cf'];
  
  // Base values depend on entropy
  const baseNav = asset.entropyBand === 'cold' ? 50000 :
                   asset.entropyBand === 'mild' ? 100000 :
                   asset.entropyBand === 'warm' ? 200000 :
                   asset.entropyBand === 'hot' ? 150000 : 100000;
  
  const volatility = asset.entropyScore / 100;
  
  dates.forEach((date, idx) => {
    const progress = idx / dates.length;
    const trend = 1 + progress * 0.5; // 50% growth over period
    const noise = Math.sin(idx * 0.3) * volatility;
    
    // COVID dip in March 2020
    const covidEffect = date >= '2020-03' && date <= '2020-05' ? -0.3 : 0;
    // 2022 downturn
    const downturn2022 = date >= '2022-01' && date <= '2022-10' ? -0.15 : 0;
    
    const navValue = baseNav * trend * (1 + noise + covidEffect + downturn2022);
    
    kpis.forEach(kpi => {
      let value = navValue;
      
      if (kpi === 'pl') {
        value = navValue - baseNav + (Math.random() - 0.5) * baseNav * 0.1;
      } else if (kpi === 'twr') {
        value = ((navValue / baseNav - 1) * 100) * (1 + (Math.random() - 0.5) * 0.2);
      } else if (kpi === 'quoted_alloc') {
        value = (baseNav / 5000000) * 100; // % of portfolio
      } else if (kpi === 'cf') {
        value = (Math.random() - 0.5) * baseNav * 0.05;
      }
      
      points.push({
        date,
        assetId: asset.id,
        kpi,
        value: Math.max(0, value)
      });
    });
  });
  
  return points;
}

export const ASSET_KPI_DATA: AssetKpiPoint[] = ASSETS.flatMap(asset => 
  generateAssetKpi(asset, MONTHLY_DATES)
);

// Signals
export const SIGNALS: Signal[] = [
  {
    id: 's1',
    date: '2020-03',
    type: 'macro',
    title: 'COVID-19 Pandemic',
    description: 'Global markets crash as pandemic spreads, triggering unprecedented volatility and central bank intervention.',
    importance: 'high',
  },
  {
    id: 's2',
    date: '2020-11',
    type: 'geopolitical',
    title: 'US Presidential Election',
    description: 'Biden wins presidency, Democrats gain control of Senate, signaling potential policy shifts.',
    importance: 'high',
  },
  {
    id: 's3',
    date: '2022-02',
    type: 'geopolitical',
    title: 'Ukraine Invasion',
    description: 'Russia invades Ukraine, triggering sanctions, energy crisis, and global supply chain disruptions.',
    importance: 'high',
  },
  {
    id: 's4',
    date: '2023-10',
    type: 'geopolitical',
    title: 'Israel-Gaza Conflict',
    description: 'Hamas attacks Israel, sparking war and raising Middle East tensions with potential energy market impacts.',
    importance: 'medium',
  },
  {
    id: 's5',
    date: '2020-03',
    type: 'rates',
    title: 'Emergency Rate Cut',
    description: 'Fed cuts rates to near-zero and launches massive QE program in response to pandemic.',
    importance: 'high',
  },
  {
    id: 's6',
    date: '2022-03',
    type: 'rates',
    title: 'Rate Hike Cycle Begins',
    description: 'Fed begins aggressive rate hikes to combat 40-year high inflation.',
    importance: 'high',
  },
  {
    id: 's7',
    date: '2023-07',
    type: 'rates',
    title: 'Rate Peak',
    description: 'Fed Funds Rate reaches 5.25-5.50%, the highest level since 2001.',
    importance: 'medium',
  },
  {
    id: 's8',
    date: '2024-09',
    type: 'rates',
    title: 'First Rate Cut',
    description: 'Fed begins cutting rates as inflation moderates, signaling end of hiking cycle.',
    importance: 'medium',
  },
  {
    id: 's9',
    date: '2021-11',
    type: 'macro',
    title: 'Peak Crypto Mania',
    description: 'Bitcoin reaches $69,000 all-time high amid institutional adoption and DeFi boom.',
    importance: 'medium',
  },
  {
    id: 's10',
    date: '2022-11',
    type: 'macro',
    title: 'FTX Collapse',
    description: 'Major crypto exchange FTX files for bankruptcy, triggering industry-wide contagion.',
    importance: 'medium',
  },
];

// Fed Funds Rate (realistic approximation)
export const FED_RATES: RatePoint[] = [
  // 2019 - gradual cuts
  { date: '2019-01', rate: 2.40 },
  { date: '2019-08', rate: 2.13 },
  { date: '2019-12', rate: 1.55 },
  
  // 2020 - emergency cuts
  { date: '2020-01', rate: 1.55 },
  { date: '2020-03', rate: 0.05 },
  { date: '2020-12', rate: 0.09 },
  
  // 2021 - near zero
  { date: '2021-01', rate: 0.09 },
  { date: '2021-12', rate: 0.08 },
  
  // 2022 - aggressive hikes
  { date: '2022-01', rate: 0.08 },
  { date: '2022-03', rate: 0.33 },
  { date: '2022-06', rate: 1.58 },
  { date: '2022-09', rate: 3.08 },
  { date: '2022-12', rate: 4.33 },
  
  // 2023 - peak rates
  { date: '2023-01', rate: 4.57 },
  { date: '2023-03', rate: 4.83 },
  { date: '2023-07', rate: 5.33 },
  { date: '2023-12', rate: 5.33 },
  
  // 2024 - hold then cut
  { date: '2024-01', rate: 5.33 },
  { date: '2024-06', rate: 5.33 },
  { date: '2024-09', rate: 4.88 },
  { date: '2024-12', rate: 4.33 },
  
  // 2025 - gradual cuts
  { date: '2025-03', rate: 3.88 },
  { date: '2025-06', rate: 3.58 },
  { date: '2025-09', rate: 3.33 },
  { date: '2025-12', rate: 3.08 },
];
