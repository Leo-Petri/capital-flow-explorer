import { Asset, AssetKpiPoint, KpiId, VolatilityBandId } from "@/data/mockData";

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

function classifyAsset(
  assetName: string,
  volatility: number,
  hasInterestRate: boolean
): AssetClassification {
  const name = assetName.toLowerCase();

  // Cash & Deposits (cold)
  if (
    name.includes("cash") ||
    name.includes("account -") ||
    name.includes("eur cash")
  ) {
    return {
      categoryPath: ["Liquid assets", "Cash"],
      isLiquid: true,
      defaultVolatility: 5,
    };
  }

  // Bonds & Fixed Income (cold-mild)
  if (
    hasInterestRate ||
    name.match(/\d{1,2}\/\d{2}\/\d{2}/) ||
    name.includes("bond")
  ) {
    return {
      categoryPath: ["Liquid assets", "Fixed Income"],
      isLiquid: true,
      defaultVolatility: 15,
    };
  }

  // Private Equity & VC (hot-very_hot)
  if (
    name.includes("pe ") ||
    name.includes("private equity") ||
    name.includes("vc fund") ||
    name.includes("venture") ||
    name.includes("carlyle") ||
    name.includes("ardian") ||
    name.includes("ballington") ||
    name.includes("alpha one")
  ) {
    return {
      categoryPath: ["Illiquid assets", "Private Equity"],
      isLiquid: false,
      defaultVolatility: 70,
    };
  }

  // Real Estate (warm)
  if (
    name.includes("properties") ||
    name.includes("place") ||
    name.includes("real estate") ||
    name.includes("property") ||
    name.includes("building")
  ) {
    return {
      categoryPath: ["Illiquid assets", "Real Estate"],
      isLiquid: false,
      defaultVolatility: 50,
    };
  }

  // Infrastructure (warm)
  if (
    name.includes("windpark") ||
    name.includes("solar") ||
    name.includes("infrastructure")
  ) {
    return {
      categoryPath: ["Illiquid assets", "Infrastructure"],
      isLiquid: false,
      defaultVolatility: 48,
    };
  }

  // Options & Derivatives (hot-very_hot)
  if (
    name.includes("call") ||
    name.includes("put") ||
    name.includes("option")
  ) {
    return {
      categoryPath: ["Liquid assets", "Derivatives"],
      isLiquid: true,
      defaultVolatility: 75,
    };
  }

  // Art & Collectibles (very_hot)
  if (
    name.includes("art") ||
    name.includes("ferrari") ||
    name.includes("collection")
  ) {
    return {
      categoryPath: ["Illiquid assets", "Alternative"],
      isLiquid: false,
      defaultVolatility: 90,
    };
  }

  // Loans (mild)
  if (
    name.includes("loan") ||
    name.includes("financing") ||
    name.includes("receivable")
  ) {
    return {
      categoryPath: ["Liquid assets", "Fixed Income"],
      isLiquid: true,
      defaultVolatility: 20,
    };
  }

  // Accruals and Other Liabilities
  if (name.includes("accrual") || name.includes("payable")) {
    return {
      categoryPath: ["Other", "Accruals"],
      isLiquid: true,
      defaultVolatility: 5,
    };
  }

  // Known public companies (mild-hot based on volatility)
  const publicEquities = [
    "microsoft",
    "alphabet",
    "google",
    "apple",
    "amazon",
    "meta",
    "facebook",
    "tesla",
    "nvidia",
    "alibaba",
    "tencent",
    "netflix",
    "adobe",
    "nestle",
    "unilever",
    "procter",
    "coca-cola",
    "pepsico",
    "jpmorgan",
    "bank of america",
    "wells fargo",
    "citigroup",
    "nova scotia",
    "exxon",
    "chevron",
    "shell",
    "bp",
    "pfizer",
    "johnson",
    "merck",
    "abbvie",
    "walmart",
    "target",
    "costco",
    "home depot",
    "boeing",
    "airbus",
    "lockheed",
    "raytheon",
    "adidas",
    "nike",
    "puma",
    "volkswagen",
    "toyota",
    "ford",
    "gm",
    "basf",
    "dow",
    "dupont",
    "siemens",
    "ge ",
    "honeywell",
    "disney",
    "comcast",
    "at&t",
    "verizon",
    "anheuser-busch",
    "diageo",
    "heineken",
    "accesso",
    "total",
    "eni",
  ];

  if (publicEquities.some((company) => name.includes(company))) {
    return { categoryPath: ["Liquid assets", "Equities"], isLiquid: true };
  }

  // Default: public equity
  return {
    categoryPath: ["Liquid assets", "Equities"],
    isLiquid: true,
    defaultVolatility: 40,
  };
}

/**
 * Calculate volatility thresholds based on actual data distribution
 * Uses percentiles to create 5 bands that evenly distribute assets
 * Ensures cold band starts at 0.1 minimum as requested
 */
function calculateVolatilityThresholds(
  volatilities: number[]
): [number, number, number, number] {
  // Filter out zero volatility and sort
  const validVolatilities = volatilities
    .filter((v) => v > 0)
    .sort((a, b) => a - b);

  if (validVolatilities.length === 0) {
    // Fallback to fixed thresholds if no valid data
    return [0.1, 0.3, 0.5, 0.75];
  }

  // Use percentiles to create 5 bands (20th, 40th, 60th, 80th percentiles)
  const p20 =
    validVolatilities[Math.floor(validVolatilities.length * 0.2)] ||
    validVolatilities[0];
  const p40 =
    validVolatilities[Math.floor(validVolatilities.length * 0.4)] ||
    validVolatilities[0];
  const p60 =
    validVolatilities[Math.floor(validVolatilities.length * 0.6)] ||
    validVolatilities[0];
  const p80 =
    validVolatilities[Math.floor(validVolatilities.length * 0.8)] ||
    validVolatilities[validVolatilities.length - 1];

  // Ensure cold starts at minimum 0.1 as requested, and thresholds are properly ordered
  const threshold1 = Math.max(0.1, Math.min(p20, p40, p60, p80)); // Cold: [0.0 - threshold1)
  const threshold2 = Math.max(threshold1, p40); // Mild: [threshold1 - threshold2)
  const threshold3 = Math.max(threshold2, p60); // Warm: [threshold2 - threshold3)
  const threshold4 = Math.max(threshold3, p80); // Hot: [threshold3 - threshold4), Very Hot: [threshold4 - ...)

  return [threshold1, threshold2, threshold3, threshold4];
}

function calculateTWR(dailyChanges: DailyChange[]): number {
  if (!dailyChanges || dailyChanges.length < 2) return 0;

  let growth = 1;

  // Loop through NAVs in date order
  for (let i = 1; i < dailyChanges.length; i++) {
    const prevNav = dailyChanges[i - 1].nav;
    const currNav = dailyChanges[i].nav;

    if (prevNav > 0) {
      const subReturn = currNav / prevNav;
      growth *= subReturn;
    }
  }

  return (growth - 1) * 100;
}

/**
 * Calculate volatility band based on raw volatility value
 * Groups assets into 5 finer bands using data-driven thresholds:
 * - cold: [0.0 - threshold1)
 * - mild: [threshold1 - threshold2)
 * - warm: [threshold2 - threshold3)
 * - hot: [threshold3 - threshold4)
 * - very_hot: [threshold4 - ...)
 */
function calculateVolatilityBand(
  volatility: number,
  thresholds: [number, number, number, number]
): VolatilityBandId {
  const [t1, t2, t3, t4] = thresholds;

  if (volatility < t1) {
    return "cold";
  } else if (volatility < t2) {
    return "mild";
  } else if (volatility < t3) {
    return "warm";
  } else if (volatility < t4) {
    return "hot";
  } else {
    return "very_hot";
  }
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
    const month = (current.getMonth() + 1).toString().padStart(2, "0");
    const day = current.getDate().toString().padStart(2, "0");
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

  sorted.forEach((change) => {
    navMap.set(change.date, change.nav);
  });

  // Return both map and sorted dates array for binary search
  return {
    map: navMap,
    sortedDates: sorted.map((c) => c.date),
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

/**
 * Calculate IRR (Internal Rate of Return) using Newton-Raphson method
 * IRR is the discount rate that makes NPV = 0
 * @param cashFlows Array of cash flows with dates: [{date: string, amount: number}, ...]
 * @param currentDate The date to calculate IRR up to
 * @param currentValue Current NAV value at currentDate (if asset is still held)
 * @returns IRR as a percentage (e.g., 10.5 for 10.5%), or 0 if calculation fails
 */
export function calculateIRR(
  cashFlows: Array<{ date: string; amount: number }>,
  currentDate: string,
  currentValue: number
): number {
  // If no activity, return 0
  if (cashFlows.length === 0 && currentValue === 0) {
    return 0;
  }

  // Collect valid flows up to the current date
  const flows: Array<{ date: Date; amount: number }> = [];

  for (const cf of cashFlows) {
    const cfDate = new Date(cf.date);
    if (cfDate <= new Date(currentDate)) {
      flows.push({ date: cfDate, amount: cf.amount });
    }
  }

  // Add final NAV as positive inflow
  if (currentValue > 0) {
    flows.push({ date: new Date(currentDate), amount: currentValue });
  }

  // Need at least one neg (investment) and one pos (return)
  const hasNegative = flows.some((f) => f.amount < 0);
  const hasPositive = flows.some((f) => f.amount > 0);

  if (!hasNegative || !hasPositive || flows.length < 2) {
    return 0;
  }

  // Sort chronologically
  flows.sort((a, b) => a.date.getTime() - b.date.getTime());

  const t0 = flows[0].date.getTime();
  const daysPerYear = 365.25;

  // Compute time fractions
  const periods: number[] = flows.map(
    (f) => (f.date.getTime() - t0) / (1000 * 60 * 60 * 24 * daysPerYear)
  );

  // NPV(r) function
  const npv = (rate: number): number => {
    return flows.reduce((sum, flow, i) => {
      const t = periods[i];
      return sum + flow.amount / Math.pow(1 + rate, t);
    }, 0);
  };

  // dNPV/dr
  const npvDerivative = (rate: number): number => {
    return flows.reduce((sum, flow, i) => {
      const t = periods[i];
      return sum - (t * flow.amount) / Math.pow(1 + rate, t + 1);
    }, 0);
  };

  // Newton-Raphson to solve for IRR
  let rate = 0.1; // initial guess = 10%
  const maxIterations = 100;
  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    const f = npv(rate);
    const df = npvDerivative(rate);

    if (Math.abs(df) < 1e-10) {
      break; // derivative too small → no convergence
    }

    const newRate = rate - f / df;

    // Converged?
    if (Math.abs(newRate - rate) < tolerance) {
      rate = newRate;
      break;
    }

    // Out of reasonable range → stop early
    if (newRate < -0.99 || newRate > 10) {
      break;
    }

    rate = newRate;
  }

  const irrPercent = Math.max(-100, Math.min(1000, rate * 100));

  if (!isFinite(irrPercent)) return 0;

  return irrPercent;
}

export function transformClientData(rawData: RawAssetData[]): {
  assets: Asset[];
  kpiData: AssetKpiPoint[];
  monthlyDates: string[]; // Keep name for compatibility, but now contains daily dates
} {
  console.log(
    "🔄 Starting transformation of",
    rawData.length,
    "raw data entries"
  );

  // Filter to only show data from 2019 onwards
  const minDate = "2019-01-01";
  const minDateObj = new Date(minDate);
  minDateObj.setHours(0, 0, 0, 0);

  // Cap latest date to today
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const latestDate = now.toISOString().split("T")[0];

  // Deduplicate by asset name and merge daily_changes
  const assetMap = new Map<
    string,
    {
      volatility: number;
      interestRate: number | string;
      purchasePrice: number;
      totalProfit: number;
      transactions: RawTransaction[];
      dailyChanges: DailyChange[];
    }
  >();

  // Optimize: Pre-filter daily_changes more efficiently
  rawData.forEach((item) => {
    // Skip assets with zero volatility
    if (item.volatility === 0) {
      return;
    }

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
    const hasTransactions =
      item.transactions_detail && item.transactions_detail.length > 0;
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
        existing.dailyChanges.forEach((dc) => dateMap.set(dc.date, dc));
        filteredDailyChanges.forEach((dc) => dateMap.set(dc.date, dc));
        existing.dailyChanges = Array.from(dateMap.values()).sort((a, b) =>
          a.date.localeCompare(b.date)
        );
      }
      // Always merge transactions (deduplicate by buy_date + sell_date)
      const transactionMap = new Map<string, RawTransaction>();
      existing.transactions.forEach((txn) => {
        const key = `${txn.buy_date}_${txn.sell_date}`;
        transactionMap.set(key, txn);
      });
      item.transactions_detail.forEach((txn) => {
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
        dailyChanges: filteredDailyChanges.sort((a, b) =>
          a.date.localeCompare(b.date)
        ),
      });
    }
  });

  console.log(
    "📋 Unique assets after deduplication and filtering:",
    assetMap.size
  );

  // Collect all unique dates from all assets' daily changes
  const allDatesSet = new Set<string>();
  assetMap.forEach((data) => {
    data.dailyChanges.forEach((dc) => {
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
    console.log(
      `📊 Sampling dates: ${originalLength} → ${dailyDates.length} days (every ${SAMPLE_INTERVAL} days)`
    );
  }

  console.log(
    "📅 Daily dates range:",
    dailyDates[0],
    "to",
    dailyDates[dailyDates.length - 1],
    `(${dailyDates.length} days)`
  );

  // Step 1: Collect all volatility values to calculate data-driven thresholds
  const allVolatilities: number[] = [];
  assetMap.forEach((data) => {
    if (data.volatility > 0) {
      allVolatilities.push(data.volatility);
    }
  });

  // Calculate thresholds based on actual data distribution
  const volatilityThresholds = calculateVolatilityThresholds(allVolatilities);
  console.log("📊 Volatility thresholds (data-driven):", {
    cold: `[0.0 - ${volatilityThresholds[0].toFixed(3)})`,
    mild: `[${volatilityThresholds[0].toFixed(
      3
    )} - ${volatilityThresholds[1].toFixed(3)})`,
    warm: `[${volatilityThresholds[1].toFixed(
      3
    )} - ${volatilityThresholds[2].toFixed(3)})`,
    hot: `[${volatilityThresholds[2].toFixed(
      3
    )} - ${volatilityThresholds[3].toFixed(3)})`,
    very_hot: `[${volatilityThresholds[3].toFixed(3)} - ...)`,
  });

  // Step 2: First classify all assets to get their categories
  const assetClassifications = new Map<string, AssetClassification>();
  assetMap.forEach((data, assetName) => {
    const hasInterestRate =
      typeof data.interestRate === "number" && data.interestRate > 0;
    const classification = classifyAsset(
      assetName,
      data.volatility,
      hasInterestRate
    );
    assetClassifications.set(assetName, classification);
  });

  // Step 3: Generate assets using data-driven volatility thresholds
  const assets: Asset[] = [];
  let assetIdCounter = 1;

  assetMap.forEach((data, assetName) => {
    // Skip assets with zero volatility (safety check)
    if (data.volatility === 0) {
      return;
    }

    const classification = assetClassifications.get(assetName)!;

    // Group assets into 5 finer bands based on data-driven thresholds
    const volatilityBand = calculateVolatilityBand(
      data.volatility,
      volatilityThresholds
    );

    assets.push({
      id: `a${assetIdCounter++}`,
      name: assetName,
      categoryPath: classification.categoryPath,
      isLiquid: classification.isLiquid,
      volatilityBand,
      // Store raw data for detailed view
      rawVolatility: data.volatility,
      interestRate: data.interestRate,
      purchasePrice: data.purchasePrice,
      totalProfit: data.totalProfit,
      transactions:
        data.transactions.length > 0 ? data.transactions : undefined,
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
  assets.forEach((asset) => {
    bandCounts[asset.volatilityBand]++;
  });
  console.log("📈 Volatility band distribution:", bandCounts);

  // Generate KPI data using actual daily NAV values
  const kpiData: AssetKpiPoint[] = [];
  const kpis: KpiId[] = ["nav", "pl", "twr", "irr", "quoted_alloc", "cf"];

  // Track initial NAV for each asset (first NAV value from 2019)
  const assetInitialNav = new Map<string, number>();
  const assetNavMaps = new Map<string, NavMapData>();

  assets.forEach((asset) => {
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
  assets.forEach((asset) => {
    const rawAsset = assetMap.get(asset.name)!;
    const navMapData = assetNavMaps.get(asset.id)!;
    const initialNav = assetInitialNav.get(asset.id) || 0;

    // Pre-calculate values that don't change per date
    const totalProfit = rawAsset.totalProfit;
    const dateCount = dailyDates.length;
    const invDateCount = 1 / dateCount; // Pre-calculate division

    // Pre-allocate array for better performance (6 KPIs per date)
    const assetKpiData: AssetKpiPoint[] = [];
    assetKpiData.length = dateCount * 6;
    let kpiIndex = 0;

    // Pre-calculate cash flows from transactions for IRR calculation
    const cashFlows: Array<{ date: string; amount: number }> = [];
    rawAsset.transactions.forEach((txn) => {
      // Buy transaction: negative cash flow (money going out)
      if (txn.buy_date >= minDate && txn.buy_date <= latestDate) {
        cashFlows.push({ date: txn.buy_date, amount: -txn.purchase_price });
      }
      // Sell transaction: positive cash flow (money coming in)
      if (txn.sell_date >= minDate && txn.sell_date <= latestDate) {
        cashFlows.push({ date: txn.sell_date, amount: txn.selling_price });
      }
    });

    dailyDates.forEach((date, idx) => {
      // Get NAV for this date from daily_changes (now using optimized binary search)
      const nav = getNavForDate(navMapData, date);

      // Calculate all KPIs for this date (pre-calculate to avoid repeated calculations)
      const navValue = Math.max(0, nav);
      const pl = nav - initialNav;
      const twr = calculateTWR(
        rawAsset.dailyChanges.filter((dc) => dc.date <= date)
      );
      const progress = idx * invDateCount; // Use multiplication instead of division
      const cf = totalProfit * progress;

      // Calculate IRR: based on cash flows up to this date and current NAV
      const irr = calculateIRR(cashFlows, date, navValue);

      // Push all KPIs at once (more efficient than individual pushes)
      assetKpiData[kpiIndex++] = {
        date,
        assetId: asset.id,
        kpi: "nav",
        value: navValue,
      };
      assetKpiData[kpiIndex++] = {
        date,
        assetId: asset.id,
        kpi: "pl",
        value: pl,
      };
      assetKpiData[kpiIndex++] = {
        date,
        assetId: asset.id,
        kpi: "twr",
        value: twr,
      };
      assetKpiData[kpiIndex++] = {
        date,
        assetId: asset.id,
        kpi: "irr",
        value: irr,
      };
      assetKpiData[kpiIndex++] = {
        date,
        assetId: asset.id,
        kpi: "quoted_alloc",
        value: navValue,
      };
      assetKpiData[kpiIndex++] = {
        date,
        assetId: asset.id,
        kpi: "cf",
        value: cf,
      };
    });

    // Add all KPIs for this asset at once
    kpiData.push(...assetKpiData);
  });

  console.log("✅ Transformation complete:", {
    assets: assets.length,
    kpiDataPoints: kpiData.length,
    dateRange: `${dailyDates[0]} to ${dailyDates[dailyDates.length - 1]}`,
  });

  return {
    assets,
    kpiData,
    monthlyDates: dailyDates, // Using daily dates but keeping the name for compatibility
  };
}
