export type VolatilityBandId = 'cold' | 'mild' | 'warm' | 'hot' | 'very_hot';

export interface Asset {
  id: string;
  name: string;
  categoryPath: string[];
  isLiquid: boolean;
  volatilityBand: VolatilityBandId;
  volatilityScore: number;
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
  color: 'green' | 'gray' | 'red';
  imageUrl?: string;
  externalUrl?: string;
}

export interface RatePoint {
  date: string;
  rate: number;
}

// CSV row interfaces for different formats
interface TechStockCsvRow {
  date: string;
  title: string;
  link: string;
  sentiment: string;
  sentiment_score: string;
}

interface FinancialNewsCsvRow {
  timestamp: string;
  new: string; // Note: 'new' is a reserved word, but it's the column name
  source: string;
  link: string;
  sentiment?: string;
  sentiment_score?: string;
}

// Helper function to parse CSV with quoted fields
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

// Parse tech stock news CSV (date, title, link, sentiment, sentiment_score)
function parseTechStockCSV(csvText: string): TechStockCsvRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const dateIdx = headers.indexOf('date');
  const titleIdx = headers.indexOf('title');
  const linkIdx = headers.indexOf('link');
  const sentimentIdx = headers.indexOf('sentiment');
  const sentimentScoreIdx = headers.indexOf('sentiment_score');

  const rows: TechStockCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);

    if (values.length >= 5) {
      rows.push({
        date: values[dateIdx] || '',
        title: values[titleIdx] || '',
        link: values[linkIdx] || '',
        sentiment: values[sentimentIdx] || '',
        sentiment_score: values[sentimentScoreIdx] || '0',
      });
    }
  }

  return rows;
}

// Parse financial news CSV (timestamp, new, source, link, sentiment, sentiment_score)
function parseFinancialNewsCSV(csvText: string): FinancialNewsCsvRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const timestampIdx = headers.indexOf('timestamp');
  const newIdx = headers.indexOf('new');
  const sourceIdx = headers.indexOf('source');
  const linkIdx = headers.indexOf('link');
  const sentimentIdx = headers.indexOf('sentiment');
  const sentimentScoreIdx = headers.indexOf('sentiment_score');

  const rows: FinancialNewsCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);

    if (values.length >= 4) {
      rows.push({
        timestamp: values[timestampIdx] || '',
        new: values[newIdx] || '',
        source: values[sourceIdx] || '',
        link: values[linkIdx] || '',
        sentiment: sentimentIdx >= 0 ? values[sentimentIdx] : undefined,
        sentiment_score: sentimentScoreIdx >= 0 ? values[sentimentScoreIdx] : undefined,
      });
    }
  }

  return rows;
}

// Helper function to determine signal type from title and sentiment
function determineSignalType(title: string, sentiment: string): 'macro' | 'geopolitical' | 'rates' | 'custom' {
  const lowerTitle = title.toLowerCase();
  
  // Check for rate-related keywords
  if (lowerTitle.includes('rate') || lowerTitle.includes('fed') || 
      lowerTitle.includes('interest') || lowerTitle.includes('monetary') ||
      lowerTitle.includes('central bank')) {
    return 'rates';
  }
  
  // Check for geopolitical keywords
  if (lowerTitle.includes('war') || lowerTitle.includes('conflict') || 
      lowerTitle.includes('sanction') || lowerTitle.includes('election') ||
      lowerTitle.includes('trade war') || lowerTitle.includes('tension') ||
      lowerTitle.includes('china') || lowerTitle.includes('russia') ||
      lowerTitle.includes('ukraine') || lowerTitle.includes('gaza') ||
      lowerTitle.includes('israel')) {
    return 'geopolitical';
  }
  
  // Default to macro for general market/economy news
  return 'macro';
}

// Helper function to determine importance from sentiment score
function determineImportance(sentimentScore: number): 'low' | 'medium' | 'high' {
  // High sentiment score (close to 1) = high importance
  // Medium sentiment score (0.5-0.8) = medium importance
  // Low sentiment score (<0.5) = low importance
  if (sentimentScore >= 0.8) return 'high';
  if (sentimentScore >= 0.5) return 'medium';
  return 'low';
}

// Helper function to determine color from sentiment
function determineColor(sentiment: string): 'green' | 'gray' | 'red' {
  const upperSentiment = sentiment.toUpperCase();
  if (upperSentiment === 'POSITIVE') return 'green';
  if (upperSentiment === 'NEUTRAL') return 'gray';
  return 'red'; // Default to red for NEGATIVE or unknown
}

// Helper function to determine importance from text content (for financial news without sentiment)
function determineImportanceFromText(text: string): 'low' | 'medium' | 'high' {
  const lowerText = text.toLowerCase();
  
  // High importance keywords
  if (lowerText.includes('recession') || lowerText.includes('crisis') || 
      lowerText.includes('crash') || lowerText.includes('surge') ||
      lowerText.includes('record') || lowerText.includes('unprecedented')) {
    return 'high';
  }
  
  // Medium importance keywords
  if (lowerText.includes('cut') || lowerText.includes('hike') || 
      lowerText.includes('forecast') || lowerText.includes('expect') ||
      lowerText.includes('warning') || lowerText.includes('concern')) {
    return 'medium';
  }
  
  return 'low';
}

// Helper function to convert date format from "2020-03-30 08:12:40" to "2020-03-30"
function formatDateForSignal(dateStr: string): string {
  // Extract YYYY-MM-DD from date string (handles both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DD" formats)
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }
  // Fallback: if already in YYYY-MM-DD format, return as is
  if (dateStr.length >= 10 && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    return dateStr.substring(0, 10);
  }
  // Fallback: if in YYYY-MM format, use first day of month
  const monthlyMatch = dateStr.match(/^(\d{4}-\d{2})/);
  if (monthlyMatch) {
    return `${monthlyMatch[1]}-01`;
  }
  return dateStr.substring(0, 10);
}

// Transform tech stock CSV row to Signal
function transformTechStockRowToSignal(row: TechStockCsvRow, index: number): Signal {
  const sentimentScore = parseFloat(row.sentiment_score) || 0;
  const dateFormatted = formatDateForSignal(row.date);
  
  return {
    id: `signal-tech-${index + 1}`,
    date: dateFormatted,
    type: determineSignalType(row.title, row.sentiment),
    title: row.title,
    description: row.title, // Use title as description
    importance: determineImportance(sentimentScore),
    color: determineColor(row.sentiment),
    externalUrl: row.link || undefined,
  };
}

// Transform financial news CSV row to Signal
function transformFinancialNewsRowToSignal(row: FinancialNewsCsvRow, index: number): Signal {
  const dateFormatted = formatDateForSignal(row.timestamp);
  const newsText = row.new; // 'new' is the column name in the CSV
  
  // Use sentiment_score if available, otherwise fall back to text-based importance
  let importance: 'low' | 'medium' | 'high';
  if (row.sentiment_score) {
    const sentimentScore = parseFloat(row.sentiment_score) || 0;
    importance = determineImportance(sentimentScore);
  } else {
    importance = determineImportanceFromText(newsText);
  }
  
  // Determine color from sentiment, default to red if not available
  const color = row.sentiment ? determineColor(row.sentiment) : 'red';
  
  return {
    id: `signal-financial-${index + 1}`,
    date: dateFormatted,
    type: determineSignalType(newsText, row.sentiment || ''),
    title: newsText.length > 100 ? newsText.substring(0, 100) + '...' : newsText,
    description: newsText,
    importance,
    color,
    externalUrl: row.link || undefined,
  };
}

// Load signals from CSV
let cachedSignals: Signal[] | null = null;

export async function loadSignalsFromCSV(): Promise<Signal[]> {
  if (cachedSignals) return cachedSignals;

  try {
    console.log('📥 Loading signals from CSV files...');
    
    // Load both CSV files in parallel
    const [techStockResponse, financialNewsResponse] = await Promise.all([
      fetch('/data/news/output_tech_news_2020_2021.csv'),
      fetch('/data/news/output_financial_news_2025.csv'),
    ]);
    
    if (!techStockResponse.ok) {
      console.warn(`⚠️ Failed to load tech stock CSV: ${techStockResponse.statusText}`);
    }
    
    if (!financialNewsResponse.ok) {
      console.warn(`⚠️ Failed to load financial news CSV: ${financialNewsResponse.statusText}`);
    }
    
    const allSignals: Signal[] = [];
    
    // Parse tech stock news
    if (techStockResponse.ok) {
      try {
        const techStockCsv = await techStockResponse.text();
        const techStockRows = parseTechStockCSV(techStockCsv);
        console.log(`✅ Parsed ${techStockRows.length} tech stock news rows`);
        
        const techStockSignals = techStockRows.map((row, index) => 
          transformTechStockRowToSignal(row, index)
        );
        allSignals.push(...techStockSignals);
      } catch (error) {
        console.error('❌ Failed to parse tech stock CSV:', error);
      }
    }
    
    // Parse financial news
    if (financialNewsResponse.ok) {
      try {
        const financialNewsCsv = await financialNewsResponse.text();
        const financialNewsRows = parseFinancialNewsCSV(financialNewsCsv);
        console.log(`✅ Parsed ${financialNewsRows.length} financial news rows`);
        
        const financialNewsSignals = financialNewsRows.map((row, index) => 
          transformFinancialNewsRowToSignal(row, index)
        );
        allSignals.push(...financialNewsSignals);
      } catch (error) {
        console.error('❌ Failed to parse financial news CSV:', error);
      }
    }
    
    // Sort by date
    allSignals.sort((a, b) => {
      // First sort by date
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      // If dates are equal, sort by title for consistency
      return a.title.localeCompare(b.title);
    });
    
    cachedSignals = allSignals;
    console.log(`✅ Loaded ${allSignals.length} total signals from CSV files`);
    
    if (allSignals.length > 0) {
      console.log(`📅 Signal date range: ${allSignals[0].date} to ${allSignals[allSignals.length - 1].date}`);
    }
    
    return allSignals;
  } catch (error) {
    console.error('❌ Failed to load signals from CSV:', error);
    // Return empty array as fallback
    return [];
  }
}

// Signals - will be loaded from CSV
export let SIGNALS: Signal[] = [];

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
  
  console.log('📥 Loading JSON file...');
  const startTime = performance.now();
  
  const { transformClientData } = await import('@/lib/dataTransformer');
  const response = await fetch('/data/full_asset_analysis.json');
  
  if (!response.ok) {
    throw new Error(`Failed to load data: ${response.statusText}`);
  }
  
  console.log('📦 Parsing JSON...');
  const parseStart = performance.now();
  const clientDataRaw = await response.json();
  const parseTime = performance.now() - parseStart;
  console.log(`✅ JSON parsed in ${(parseTime / 1000).toFixed(2)}s (${clientDataRaw.length} assets)`);
  
  console.log('🔄 Transforming data...');
  const transformStart = performance.now();
  const transformedData = transformClientData(clientDataRaw);
  const transformTime = performance.now() - transformStart;
  console.log(`✅ Data transformed in ${(transformTime / 1000).toFixed(2)}s`);
  
  cachedData = {
    MONTHLY_DATES: transformedData.monthlyDates,
    ASSETS: transformedData.assets,
    ASSET_KPI_DATA: transformedData.kpiData,
  };
  
  const totalTime = performance.now() - startTime;
  console.log(`🎉 Total loading time: ${(totalTime / 1000).toFixed(2)}s`);
  
  return cachedData;
}

// Export empty defaults for initial render
export let MONTHLY_DATES: string[] = [];
export let ASSETS: Asset[] = [];
export let ASSET_KPI_DATA: AssetKpiPoint[] = [];
