import { Asset, EntropyBandId, Signal, KpiId } from '@/data/mockData';
import { ENTROPY_BAND_INFO, getBandStats, getAssetsInBand, getAssetKpiSeries } from '@/lib/aggregation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, TrendingUp, TrendingDown } from 'lucide-react';

interface InspectorPanelProps {
  selectedBand: EntropyBandId | null;
  selectedAsset: Asset | null;
  selectedSignal: Signal | null;
  assets: Asset[];
  currentDate: string;
  selectedKpi: KpiId;
  onSelectAsset: (asset: Asset | null) => void;
  onClose: () => void;
  monthlyDates: string[];
  assetKpiData: any[];
}

const BAND_COLORS: Record<EntropyBandId, string> = {
  cold: 'bg-entropy-cold',
  mild: 'bg-entropy-mild',
  warm: 'bg-entropy-warm',
  hot: 'bg-entropy-hot',
  very_hot: 'bg-entropy-very-hot',
};

export function InspectorPanel({
  selectedBand,
  selectedAsset,
  selectedSignal,
  assets,
  currentDate,
  selectedKpi,
  onSelectAsset,
  onClose,
  monthlyDates,
  assetKpiData,
}: InspectorPanelProps) {
  if (!selectedBand && !selectedAsset && !selectedSignal) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground space-y-2">
          <p className="text-sm">Click on an entropy band, asset, or signal to inspect details.</p>
        </div>
      </div>
    );
  }

  // Signal Inspector
  if (selectedSignal) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <Badge variant="outline" className="mb-2 uppercase tracking-wider">
              {selectedSignal.type}
            </Badge>
            <h2 className="text-xl font-bold text-foreground">{selectedSignal.title}</h2>
            <p className="text-sm text-muted-foreground font-mono mt-1">{selectedSignal.date}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-button-hover">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Importance</h3>
            <Badge variant={
              selectedSignal.importance === 'high' ? 'destructive' :
              selectedSignal.importance === 'medium' ? 'default' : 'secondary'
            } className="uppercase">
              {selectedSignal.importance}
            </Badge>
          </div>

          <div>
            <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Description</h3>
            <p className="text-sm text-foreground leading-relaxed">
              {selectedSignal.description}
            </p>
          </div>

          {selectedSignal.externalUrl && (
            <Button variant="secondary" className="w-full bg-button-base hover:bg-button-hover" asChild>
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
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">{selectedAsset.name}</h2>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={BAND_COLORS[selectedAsset.entropyBand]}>
                {ENTROPY_BAND_INFO[selectedAsset.entropyBand].name}
              </Badge>
              <Badge variant={selectedAsset.isLiquid ? 'default' : 'secondary'}>
                {selectedAsset.isLiquid ? 'Liquid' : 'Illiquid'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedAsset.categoryPath.join(' / ')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSelectAsset(null)} className="hover:bg-button-hover">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Card className="bg-secondary/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Entropy Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Score</span>
              <span className="text-lg font-mono font-semibold text-primary">{selectedAsset.entropyScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Band</span>
              <span className="text-sm text-foreground">{ENTROPY_BAND_INFO[selectedAsset.entropyBand].range}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/50 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Current Value</span>
              <span className="text-lg font-mono font-semibold text-foreground">
                ${currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Change</span>
              <div className="flex items-center gap-1">
                {change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-lg font-mono font-semibold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
    const info = ENTROPY_BAND_INFO[selectedBand];
    const stats = getBandStats(selectedBand, assets, assetKpiData, selectedKpi, currentDate);
    const bandAssets = getAssetsInBand(assets, selectedBand);

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="p-6 space-y-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <Badge className={`${BAND_COLORS[selectedBand]} mb-2 uppercase tracking-wider`}>
                {info.name}
              </Badge>
              <h2 className="text-xl font-bold text-foreground">
                Entropy {info.range}
              </h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-button-hover">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-foreground leading-relaxed">
            {info.description}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-secondary/50 border-border">
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Current Value</div>
                <div className="text-xl font-bold font-mono text-foreground">
                  ${stats.currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-secondary/50 border-border">
              <CardContent className="pt-4 pb-4">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Avg Entropy</div>
                <div className="text-xl font-bold font-mono text-primary">
                  {stats.avgEntropy.toFixed(1)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
            Assets ({bandAssets.length})
          </h3>
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {bandAssets.map(asset => (
                <Button
                  key={asset.id}
                  variant="secondary"
                  className="w-full justify-start text-left h-auto py-3 bg-button-base hover:bg-button-hover transition-colors"
                  onClick={() => onSelectAsset(asset)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm text-foreground">{asset.name}</div>
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
