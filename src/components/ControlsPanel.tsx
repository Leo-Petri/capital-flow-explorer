import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { KpiId } from '@/data/mockData';

interface ControlsPanelProps {
  currentDateIndex: number;
  maxDateIndex: number;
  currentDate: string;
  isPlaying: boolean;
  onDateIndexChange: (index: number) => void;
  onPlayPause: () => void;
  filterMode: 'all' | 'liquid' | 'illiquid';
  onFilterModeChange: (mode: 'all' | 'liquid' | 'illiquid') => void;
  entropyThreshold: number;
  onEntropyThresholdChange: (value: number) => void;
  selectedKpi: KpiId;
  onKpiChange: (kpi: KpiId) => void;
  showFedRate: boolean;
  onShowFedRateChange: (show: boolean) => void;
}

const KPI_LABELS: Record<KpiId, string> = {
  nav: 'Net Asset Value',
  pl: 'Profit & Loss',
  twr: 'Time-Weighted Return (%)',
  quoted_alloc: 'Quoted Allocation (%)',
  cf: 'Cash Flow',
};

export function ControlsPanel({
  currentDateIndex,
  maxDateIndex,
  currentDate,
  isPlaying,
  onDateIndexChange,
  onPlayPause,
  filterMode,
  onFilterModeChange,
  entropyThreshold,
  onEntropyThresholdChange,
  selectedKpi,
  onKpiChange,
  showFedRate,
  onShowFedRateChange,
}: ControlsPanelProps) {
  return (
    <div className="w-80 bg-card border-r border-border p-6 space-y-8 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">River of Wealth</h1>
        <p className="text-sm text-muted-foreground">Entropy Lens Portfolio</p>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Timeline</h2>
          <div className="flex items-center gap-2 mb-3">
            <Button
              size="sm"
              variant="outline"
              onClick={onPlayPause}
              className="w-10 h-10 p-0"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="flex-1">
              <p className="text-sm font-mono text-muted-foreground">
                {currentDate}
              </p>
            </div>
          </div>
          <Slider
            value={[currentDateIndex]}
            onValueChange={([val]) => onDateIndexChange(val)}
            max={maxDateIndex}
            step={1}
            className="w-full"
          />
        </div>
      </div>

      {/* View Filters */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">View</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filterMode === 'all' ? 'default' : 'outline'}
            onClick={() => onFilterModeChange('all')}
            className="flex-1"
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filterMode === 'liquid' ? 'default' : 'outline'}
            onClick={() => onFilterModeChange('liquid')}
            className="flex-1"
          >
            Liquid
          </Button>
          <Button
            size="sm"
            variant={filterMode === 'illiquid' ? 'default' : 'outline'}
            onClick={() => onFilterModeChange('illiquid')}
            className="flex-1"
          >
            Illiquid
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">
            Entropy Threshold: {entropyThreshold}
          </Label>
          <Slider
            value={[entropyThreshold]}
            onValueChange={([val]) => onEntropyThresholdChange(val)}
            max={100}
            step={5}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Highlight assets above this entropy score
          </p>
        </div>
      </div>

      {/* KPI Selection */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground mb-3">KPI</h2>
        <div className="space-y-2">
          <Label className="text-sm">View KPI as Y-Axis</Label>
          <Select value={selectedKpi} onValueChange={(val) => onKpiChange(val as KpiId)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(KPI_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fed Rate Toggle */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground mb-3">Overlays</h2>
        <div className="flex items-center justify-between">
          <Label htmlFor="fed-rate" className="text-sm cursor-pointer">
            Show Fed Funds Rate
          </Label>
          <Switch
            id="fed-rate"
            checked={showFedRate}
            onCheckedChange={onShowFedRateChange}
          />
        </div>
      </div>
    </div>
  );
}
