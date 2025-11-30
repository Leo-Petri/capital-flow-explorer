import { Asset, VolatilityBandId, Signal, KpiId } from '@/data/mockData';
import { VOLATILITY_BAND_INFO, getBandStats, getAssetsInBand, getAssetKpiSeries } from '@/lib/aggregation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, TrendingUp, TrendingDown } from 'lucide-react';

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
}

const BAND_COLORS: Record<VolatilityBandId, string> = {
  cold: 'bg-volatility-cold',
  mild: 'bg-volatility-mild',
  warm: 'bg-volatility-warm',
  hot: 'bg-volatility-hot',
  very_hot: 'bg-volatility-very-hot',
};

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
}: InspectorPanelProps) {

  if (!selectedBand && !selectedAsset && !selectedSignal) {
    return (
      <div className="w-96 bg-card border-l border-border p-6">
        <div className="text-center text-muted-foreground space-y-2">
          <p className="text-sm">Click on a volatility band, asset, or signal to inspect details.</p>
        </div>
      </div>
    );
  }

  // Signal Inspector
  if (selectedSignal) {
    return (
      <div className="w-96 bg-card border-l border-border p-6 space-y-4 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="outline" className="mb-2">
              {selectedSignal.type.toUpperCase()}
            </Badge>
            <h2 className="text-xl font-bold text-foreground">{selectedSignal.title}</h2>
            <p className="text-sm text-muted-foreground font-mono">{selectedSignal.date}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Importance</h3>
            <Badge variant={
              selectedSignal.importance === 'high' ? 'destructive' :
              selectedSignal.importance === 'medium' ? 'default' : 'secondary'
            }>
              {selectedSignal.importance.toUpperCase()}
            </Badge>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedSignal.description}
            </p>
          </div>

          {selectedSignal.externalUrl && (
            <Button variant="outline" className="w-full" asChild>
              <a href={selectedSignal.externalUrl} target="_blank" rel="noopener noreferrer">
                Open Source
              </a>
            </Button>
          )}
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

    return (
      <div className="w-96 bg-card border-l border-border p-6 space-y-4 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">{selectedAsset.name}</h2>
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
            <CardTitle className="text-sm">Volatility Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Score</span>
              <span className="text-sm font-mono font-semibold">{selectedAsset.volatilityScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Band</span>
              <span className="text-sm">{VOLATILITY_BAND_INFO[selectedAsset.volatilityBand].range}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Current Value</span>
              <span className="text-sm font-mono font-semibold">
                ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
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
          </CardContent>
        </Card>
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
      <div className="w-96 bg-card border-l border-border flex flex-col overflow-hidden">
        <div className="p-6 space-y-4 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <Badge className={`${BAND_COLORS[selectedBand]} mb-2`}>
                {info.name}
              </Badge>
              <h2 className="text-xl font-bold text-foreground">
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
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Current Value</div>
                <div className="text-lg font-bold font-mono">
                  ${stats.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground mb-1">Avg Volatility</div>
                <div className="text-lg font-bold font-mono">
                  {stats.avgVolatility.toFixed(1)}
                </div>
              </CardContent>
            </Card>
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
