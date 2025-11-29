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

// Client data - loaded dynamically
let cachedData: {
  MONTHLY_DATES: string[];
  ASSETS: Asset[];
  ASSET_KPI_DATA: AssetKpiPoint[];
} | null = null;

export async function loadClientData() {
  if (cachedData) return cachedData;
  
  const { transformClientData } = await import('@/lib/dataTransformer');
  const response = await fetch('/data/full_asset_analysis.json');
  const clientDataRaw = await response.json();
  
  const transformedData = transformClientData(clientDataRaw);
  
  cachedData = {
    MONTHLY_DATES: transformedData.monthlyDates,
    ASSETS: transformedData.assets,
    ASSET_KPI_DATA: transformedData.kpiData,
  };
  
  return cachedData;
}

// Export empty defaults for initial render
export let MONTHLY_DATES: string[] = [];
export let ASSETS: Asset[] = [];
export let ASSET_KPI_DATA: AssetKpiPoint[] = [];
