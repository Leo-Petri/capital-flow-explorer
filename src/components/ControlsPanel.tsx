import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { KpiId } from '@/data/mockData';
import oscilLaLogo from '@/assets/oscilla-logo.png';

function formatDate(dateStr: string): string {
  // Handle both YYYY-MM-DD and YYYY-MM formats
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD format
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } else if (parts.length === 2) {
      // YYYY-MM format
      const date = new Date(dateStr + '-01');
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
    }
  }
  return dateStr;
}

interface ControlsPanelProps {
  currentDateIndex: number;
  maxDateIndex: number;
  currentDate: string;
  isPlaying: boolean;
  onDateIndexChange: (index: number) => void;
  onPlayPause: () => void;
  filterMode: 'all' | 'liquid' | 'illiquid';
  onFilterModeChange: (mode: 'all' | 'liquid' | 'illiquid') => void;
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
  selectedKpi,
  onKpiChange,
  showFedRate,
  onShowFedRateChange,
}: ControlsPanelProps) {
  return (
    <div className="h-full rounded-none p-6 space-y-8 overflow-y-auto border-r border-[#1F2937]" style={{ backgroundColor: '#111827' }}>
      {/* Logo */}
      <div className="mb-6">
        <img 
          src={oscilLaLogo} 
          alt="Oscilla" 
          className="h-16 w-auto opacity-100"
          style={{ filter: 'brightness(1) contrast(1)' }}
        />
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">Timeline</h2>
          <div className="flex items-center gap-2 mb-3">
            <Button
              size="sm"
              variant="outline"
              onClick={onPlayPause}
              className="w-10 h-10 p-0 rounded-none bg-[#1E293B] hover:bg-[#334155] border-[#1F2937]"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="flex-1">
              <p className="text-sm font-mono text-[#E5E7EB]">
                {formatDate(currentDate)}
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
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">View</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filterMode === 'all' ? 'default' : 'outline'}
            onClick={() => onFilterModeChange('all')}
            className={`flex-1 rounded-none ${filterMode === 'all' ? 'bg-[#4DA3F7] hover:bg-[#3B8DE0] text-[#0D1117]' : 'bg-[#1E293B] hover:bg-[#334155] border-[#1F2937] text-[#E5E7EB]'}`}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filterMode === 'liquid' ? 'default' : 'outline'}
            onClick={() => onFilterModeChange('liquid')}
            className={`flex-1 rounded-none ${filterMode === 'liquid' ? 'bg-[#4DA3F7] hover:bg-[#3B8DE0] text-[#0D1117]' : 'bg-[#1E293B] hover:bg-[#334155] border-[#1F2937] text-[#E5E7EB]'}`}
          >
            Liquid
          </Button>
          <Button
            size="sm"
            variant={filterMode === 'illiquid' ? 'default' : 'outline'}
            onClick={() => onFilterModeChange('illiquid')}
            className={`flex-1 rounded-none ${filterMode === 'illiquid' ? 'bg-[#4DA3F7] hover:bg-[#3B8DE0] text-[#0D1117]' : 'bg-[#1E293B] hover:bg-[#334155] border-[#1F2937] text-[#E5E7EB]'}`}
          >
            Illiquid
          </Button>
        </div>
      </div>

      {/* KPI Selector */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">Choose Financial KPI</h2>
        <div className="space-y-2">
          <Label className="text-sm text-[#9CA3AF]">View KPI as Y-Axis</Label>
          <Select value={selectedKpi} onValueChange={(val) => onKpiChange(val as KpiId)}>
            <SelectTrigger className="rounded-none bg-[#1E293B] border-[#1F2937] text-[#E5E7EB]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none bg-[#111827] border-[#1F2937]">
              {Object.entries(KPI_LABELS)
                .filter(([key]) => key !== 'pl' && key !== 'quoted_alloc' && key !== 'cf')
                .map(([key, label]) => (
                  <SelectItem key={key} value={key} className="text-[#E5E7EB]">
                    {label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fed Rate Toggle */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">Overlays</h2>
        <div className="flex items-center justify-between">
          <Label htmlFor="fed-rate" className="text-sm text-[#9CA3AF] cursor-pointer">
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
