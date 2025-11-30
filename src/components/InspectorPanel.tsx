import { Asset, VolatilityBandId, Signal, KpiId, FED_RATES, RatePoint } from '@/data/mockData';
import { VOLATILITY_BAND_INFO, getBandStats, getAssetsInBand, getAssetKpiSeries, aggregateByVolatilityBand } from '@/lib/aggregation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface InspectorPanelProps {
  selectedBand: VolatilityBandId | null;
  selectedAsset: Asset | null;
  selectedSignal: Signal | null;
  assets: Asset[]; // Filtered assets for display
  allAssets?: Asset[]; // All assets for stats calculation (optional, falls back to assets)
  currentDate: string;
  selectedKpi: KpiId;
  onSelectAsset: (asset: Asset | null) => void;
  onClose: () => void;
  monthlyDates: string[];
  assetKpiData: any[];
  stackedData?: Array<{
    date: string;
    cold: number;
    mild: number;
    warm: number;
    hot: number;
    very_hot: number;
    total: number;
  }>;
}

const BAND_COLORS: Record<VolatilityBandId, string> = {
  cold: 'bg-[#2D5A87] text-white',        // Deep navy → soft teal
  mild: 'bg-[#475569] text-white',        // Slate → steel blue
  warm: 'bg-[#D97706] text-white',        // Amber → muted gold
  hot: 'bg-[#EA580C] text-white',         // Orange-red
  very_hot: 'bg-[#991B1B] text-white',    // Plum → crimson
};

// Helper function to get Fed rate for a given date
function getFedRateForDate(date: string, fedRates: RatePoint[]): number | null {
  if (!date || fedRates.length === 0) return null;
  
  // Extract YYYY-MM from date
  const datePrefix = date.substring(0, 7);
  
  // Find the most recent rate point that is <= the date
  let latestRate: RatePoint | null = null;
  for (const rate of fedRates) {
    if (rate.date <= datePrefix) {
      if (!latestRate || rate.date > latestRate.date) {
        latestRate = rate;
      }
    }
  }
  
  return latestRate ? latestRate.rate : null;
}

// Analyze Risk-On/Risk-Off behavior during interest rate regimes
interface RegimeAnalysis {
  period: string;
  coldPct: number;
  mildPct: number;
  warmPct: number;
  hotPct: number;
  veryHotPct: number;
  stance: 'Risk-On' | 'Risk-Off' | 'Neutral';
}

function analyzeRiskBehavior(
  stackedData: Array<{ date: string; cold: number; mild: number; warm: number; hot: number; very_hot: number; total: number }> | undefined
): {
  rateCuts1: RegimeAnalysis;
  zeroRates: RegimeAnalysis;
  rateHikes: RegimeAnalysis;
  constantRates: RegimeAnalysis;
  rateCuts2: RegimeAnalysis;
} | null {
  if (!stackedData || stackedData.length === 0) return null;

  // Define five fixed interest rate regimes
  const regimes = [
    {
      key: 'rateCuts1' as const,
      period: 'Rate Cuts (2019-2020)',
      start: '2019-01',
      end: '2020-02',
    },
    {
      key: 'zeroRates' as const,
      period: 'Zero Rates (2020-2022)',
      start: '2020-03',
      end: '2022-01',
    },
    {
      key: 'rateHikes' as const,
      period: 'Rate Hikes (2022-2023)',
      start: '2022-02',
      end: '2023-06',
    },
    {
      key: 'constantRates' as const,
      period: 'Constant Rates (mid 2023 - end 2024)',
      start: '2023-07',
      end: '2024-12',
    },
    {
      key: 'rateCuts2' as const,
      period: 'Rate Cuts (end 2024 - 2025)',
      start: '2025-01',
      end: '2025-12',
    },
  ];

  const results: any = {};

  regimes.forEach(regime => {
    // Filter data for this regime
    const regimeData = stackedData.filter(d => {
      const datePrefix = d.date.substring(0, 7);
      return datePrefix >= regime.start && datePrefix <= regime.end;
    });

    if (regimeData.length === 0) {
      results[regime.key] = {
        period: regime.period,
        coldPct: 0,
        mildPct: 0,
        warmPct: 0,
        hotPct: 0,
        veryHotPct: 0,
        stance: 'Neutral' as const,
      };
      return;
    }

    // Calculate average percentages for each volatility band in this regime
    const avgCold = regimeData.reduce((sum, d) => {
      const total = d.total || 1;
      return sum + (d.cold / total) * 100;
    }, 0) / regimeData.length;

    const avgMild = regimeData.reduce((sum, d) => {
      const total = d.total || 1;
      return sum + (d.mild / total) * 100;
    }, 0) / regimeData.length;

    const avgWarm = regimeData.reduce((sum, d) => {
      const total = d.total || 1;
      return sum + (d.warm / total) * 100;
    }, 0) / regimeData.length;

    const avgHot = regimeData.reduce((sum, d) => {
      const total = d.total || 1;
      return sum + (d.hot / total) * 100;
    }, 0) / regimeData.length;

    const avgVeryHot = regimeData.reduce((sum, d) => {
      const total = d.total || 1;
      return sum + (d.very_hot / total) * 100;
    }, 0) / regimeData.length;

    // Determine stance:
    // Risk-On if high-entropy (Warm + Hot + Very Hot) > 50%
    // Risk-Off if low-entropy (Cold + Mild) > 50%
    // Neutral otherwise
    const highVolPct = avgWarm + avgHot + avgVeryHot;
    const lowVolPct = avgCold + avgMild;
    let stance: 'Risk-On' | 'Risk-Off' | 'Neutral';
    if (highVolPct > 50) {
      stance = 'Risk-On';
    } else if (lowVolPct > 50) {
      stance = 'Risk-Off';
    } else {
      stance = 'Neutral';
    }

    results[regime.key] = {
      period: regime.period,
      coldPct: avgCold,
      mildPct: avgMild,
      warmPct: avgWarm,
      hotPct: avgHot,
      veryHotPct: avgVeryHot,
      stance,
    };
  });

  return results;
}

export function InspectorPanel({
  selectedBand,
  selectedAsset,
  selectedSignal,
  assets,
  allAssets,
  currentDate,
  selectedKpi,
  onSelectAsset,
  onClose,
  monthlyDates,
  assetKpiData,
  stackedData,
}: InspectorPanelProps) {

  // Show Risk-On/Risk-Off Analysis by default when nothing is selected
  if (!selectedBand && !selectedAsset) {
    // Risk-On/Risk-Off analysis should always use NAV for the entire portfolio,
    // regardless of selected KPI or filter mode
    const assetsForAnalysis = allAssets || assets;
    const navStackedData = aggregateByVolatilityBand(
      assetsForAnalysis,
      assetKpiData,
      'nav', // Always use NAV for Risk-On/Risk-Off analysis
      monthlyDates
    );
    const riskAnalysis = analyzeRiskBehavior(navStackedData);
    
    if (!riskAnalysis) {
      return (
        <div className="h-full rounded-none border-l border-[#1F2937] p-6" style={{ backgroundColor: '#111827' }}>
          <div className="text-center text-[#9CA3AF] space-y-2">
            <p className="text-sm">Click on a volatility band or asset to inspect details.</p>
          </div>
        </div>
      );
    }

    const regimes = [
      riskAnalysis.rateCuts1,
      riskAnalysis.zeroRates,
      riskAnalysis.rateHikes,
      riskAnalysis.constantRates,
      riskAnalysis.rateCuts2,
    ];

    return (
      <div className="h-full rounded-none border-l border-[#1F2937] p-6 overflow-y-auto" style={{ backgroundColor: '#111827' }}>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#E5E7EB] mb-2">Risk-On/Risk-Off Analysis</h2>
            <p className="text-sm text-muted-foreground">
              Portfolio allocation behavior across different interest rate environments
            </p>
          </div>
          
          <div className="space-y-4 pt-2">
            {regimes.map((regime, idx) => (
              <Card key={idx}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-foreground">{regime.period}</span>
                    <Badge 
                      variant="outline" 
                      className={
                        regime.stance === 'Risk-On'
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : regime.stance === 'Risk-Off'
                          ? 'bg-green-500/10 text-green-600 border-green-600/30'
                          : 'bg-green-500/10 text-green-500 border-green-500/30'
                      }
                    >
                      {regime.stance}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1.5 pl-2">
                    <div className="flex justify-between">
                      <span>Cold:</span>
                      <span className="font-mono font-semibold text-foreground">{regime.coldPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mild:</span>
                      <span className="font-mono font-semibold text-foreground">{regime.mildPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Warm:</span>
                      <span className="font-mono font-semibold text-foreground">{regime.warmPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hot:</span>
                      <span className="font-mono font-semibold text-foreground">{regime.hotPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Very Hot:</span>
                      <span className="font-mono font-semibold text-foreground">{regime.veryHotPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="pt-4 border-t border-[rgba(255,255,255,0.05)]">
            <p className="text-xs text-muted-foreground text-center">
              Click on a volatility band or asset to inspect details
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Asset Inspector
  if (selectedAsset) {
    const series = getAssetKpiSeries(selectedAsset.id, selectedKpi, assetKpiData, monthlyDates);
    const currentValue = series.find(s => s.date === currentDate)?.value || 0;
    const firstValue = series[0]?.value || 0;
    const change = currentValue - firstValue;
    const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;
    
    // Get NAV series for position display
    const navSeries = getAssetKpiSeries(selectedAsset.id, 'nav', assetKpiData, monthlyDates);
    const position = navSeries.find(s => s.date === currentDate)?.value || 0;

    return (
      <div className="h-full rounded-none p-6 space-y-4 overflow-y-auto border-l border-[#1F2937]" style={{ backgroundColor: '#111827' }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#E5E7EB] mb-1">{selectedAsset.name}</h2>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={BAND_COLORS[selectedAsset.volatilityBand]}>
                {VOLATILITY_BAND_INFO[selectedAsset.volatilityBand].name}
              </Badge>
              <Badge variant={selectedAsset.isLiquid ? 'default' : 'secondary'}>
                {selectedAsset.isLiquid ? 'Liquid' : 'Illiquid'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedAsset.categoryPath.join(' / ')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSelectAsset(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Position & Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {position > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Current Position (NAV)</span>
                  <span className="text-sm font-mono font-semibold">
                    ${position.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {currentValue > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Current Value</span>
                  <span className="text-sm font-mono font-semibold">
                    ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              )}
              {selectedAsset.purchasePrice !== undefined && selectedAsset.purchasePrice > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Purchase Price</span>
                  <span className="text-sm font-mono font-semibold">
                    ${selectedAsset.purchasePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {selectedAsset.totalProfit !== undefined && selectedAsset.totalProfit !== 0 && selectedAsset.totalProfit !== null && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Profit/Loss</span>
                  <div className="flex items-center gap-1">
                    {selectedAsset.totalProfit >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-sm font-mono font-semibold ${selectedAsset.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ${selectedAsset.totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
              {firstValue > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Change</span>
                  <div className="flex items-center gap-1">
                    {change >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`text-sm font-mono font-semibold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Position Chart */}
            {(() => {
              // OPTIMIZATION: Pre-filter and map in single pass
              const chartData: { date: string; position: number }[] = [];
              for (let i = 0; i < navSeries.length; i++) {
                const s = navSeries[i];
                if (s.value > 0) {
                  chartData.push({ date: s.date, position: s.value });
                }
              }
              
              // Show chart if we have at least 2 data points (needed for a line)
              if (chartData.length < 2) {
                return null;
              }
              
              // OPTIMIZATION: Memoize formatters to avoid creating functions on every render
              const dateTickFormatter = (value: string) => {
                try {
                  const date = new Date(value);
                  if (isNaN(date.getTime())) return value;
                  return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                } catch {
                  return value;
                }
              };
              
              const positionTickFormatter = (value: number) => {
                if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                return `$${value}`;
              };
              
              const tooltipLabelFormatter = (value: string) => {
                try {
                  const date = new Date(value);
                  if (isNaN(date.getTime())) return value;
                  return date.toLocaleDateString();
                } catch {
                  return value;
                }
              };
              
              const tooltipFormatter = (value: number, name: string) => {
                if (name === 'Position (NAV)') {
                  return [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name];
                }
                return [value, name];
              };
              
              return (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Position Over Time</h4>
                  <ChartContainer
                    config={{
                      position: {
                        label: "Position (NAV)",
                        color: "hsl(var(--chart-line-bright))",
                      },
                    }}
                    className="h-[200px] w-full"
                  >
                    <ComposedChart 
                      data={chartData}
                      margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={dateTickFormatter}
                        className="text-xs"
                        interval="preserveStartEnd"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis
                        yAxisId="position"
                        tickFormatter={positionTickFormatter}
                        className="text-xs"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        labelFormatter={tooltipLabelFormatter}
                        formatter={tooltipFormatter}
                      />
                      <Line
                        yAxisId="position"
                        type="monotone"
                        dataKey="position"
                        stroke="hsl(var(--chart-line-bright))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "hsl(var(--chart-line-bright))" }}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Volatility Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedAsset.rawVolatility !== undefined && selectedAsset.rawVolatility !== null && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Volatility</span>
                <span className="text-sm font-mono font-semibold">
                  {selectedAsset.rawVolatility.toFixed(4)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Band</span>
              <span className="text-sm">{VOLATILITY_BAND_INFO[selectedAsset.volatilityBand].range}</span>
            </div>
            {selectedAsset.interestRate !== undefined && 
             selectedAsset.interestRate !== '-' && 
             selectedAsset.interestRate !== null &&
             (typeof selectedAsset.interestRate === 'number' ? selectedAsset.interestRate > 0 : true) && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Interest Rate</span>
                <span className="text-sm font-mono font-semibold">
                  {typeof selectedAsset.interestRate === 'number' 
                    ? `${selectedAsset.interestRate.toFixed(2)}%`
                    : selectedAsset.interestRate}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedAsset.transactions && selectedAsset.transactions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Transactions ({selectedAsset.transactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {selectedAsset.transactions.map((txn, idx) => (
                    <div key={idx} className="text-xs space-y-1 pb-3 border-b border-[rgba(255,255,255,0.05)] last:border-0">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Buy Date</span>
                        <span className="font-mono">{txn.buy_date}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Sell Date</span>
                        <span className="font-mono">{txn.sell_date}</span>
                      </div>
                      {txn.purchase_price !== undefined && txn.purchase_price > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Purchase Price</span>
                          <span className="font-mono">${txn.purchase_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {txn.selling_price !== undefined && txn.selling_price > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Selling Price</span>
                          <span className="font-mono">${txn.selling_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Buy NAV</span>
                        <span className="font-mono">${txn.buy_nav.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Sell NAV</span>
                        <span className="font-mono">${txn.sell_nav.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-muted-foreground font-semibold">Profit/Loss</span>
                        <div className="flex items-center gap-1">
                          {txn.profit >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          <span className={`font-mono font-semibold ${txn.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ${txn.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Band Inspector
  if (selectedBand) {
    const info = VOLATILITY_BAND_INFO[selectedBand];
    // Use allAssets for stats to get accurate totals for the entire volatility group
    // Fall back to assets if allAssets is not provided
    const assetsForStats = allAssets || assets;
    const stats = getBandStats(selectedBand, assetsForStats, assetKpiData, selectedKpi, currentDate);
    // Use filtered assets for the display list
    const bandAssets = getAssetsInBand(assets, selectedBand);

    return (
      <div className="h-full rounded-none flex flex-col overflow-hidden border-l border-[#1F2937]" style={{ backgroundColor: '#111827' }}>
        <div className="p-6 space-y-4 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-start justify-between">
            <div>
              <Badge className={`${BAND_COLORS[selectedBand]} mb-2`}>
                {info.name}
              </Badge>
              <h2 className="text-xl font-bold text-[rgba(255,255,255,0.90)]">
                Volatility {info.range}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {info.description}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {stats.currentValue > 0 && (
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs text-muted-foreground mb-1">Current Value</div>
                  <div className="text-lg font-bold font-mono">
                    ${stats.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>
            )}
            {stats.avgVolatility > 0 && (
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs text-muted-foreground mb-1">Avg Volatility</div>
                  <div className="text-lg font-bold font-mono">
                    {stats.avgVolatility.toFixed(4)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <h3 className="text-sm font-semibold mb-3">
            Assets ({bandAssets.length})
          </h3>
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {bandAssets.map(asset => (
                <Button
                  key={asset.id}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => onSelectAsset(asset)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{asset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {asset.categoryPath[asset.categoryPath.length - 1]}
                    </div>
                  </div>
                  <Badge variant={asset.isLiquid ? 'default' : 'secondary'} className="ml-2">
                    {asset.isLiquid ? 'L' : 'I'}
                  </Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  return null;
}
