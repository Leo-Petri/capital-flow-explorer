import { useState, useEffect, useMemo } from 'react';
import { ControlsPanel } from '@/components/ControlsPanel';
import { EntropyRiver } from '@/components/EntropyRiver';
import { InspectorPanel } from '@/components/InspectorPanel';
import { ASSETS, ASSET_KPI_DATA, MONTHLY_DATES, SIGNALS, FED_RATES, KpiId, EntropyBandId, Asset, Signal } from '@/data/mockData';
import { aggregateByEntropyBand } from '@/lib/aggregation';

const Index = () => {
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'liquid' | 'illiquid'>('all');
  const [entropyThreshold, setEntropyThreshold] = useState(0);
  const [selectedKpi, setSelectedKpi] = useState<KpiId>('nav');
  const [showFedRate, setShowFedRate] = useState(true);
  const [selectedBand, setSelectedBand] = useState<EntropyBandId | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  const currentDate = MONTHLY_DATES[currentDateIndex];

  // Filter assets based on mode
  const filteredAssets = useMemo(() => {
    let filtered = [...ASSETS];
    
    if (filterMode === 'liquid') {
      filtered = filtered.filter(a => a.isLiquid);
    } else if (filterMode === 'illiquid') {
      filtered = filtered.filter(a => !a.isLiquid);
    }
    
    return filtered;
  }, [filterMode]);

  // Aggregate data for visualization
  const stackedData = useMemo(() => {
    return aggregateByEntropyBand(filteredAssets, ASSET_KPI_DATA, selectedKpi);
  }, [filteredAssets, selectedKpi]);

  // Play/pause animation
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentDateIndex(prev => {
        if (prev >= MONTHLY_DATES.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 150);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleBandClick = (band: EntropyBandId | null) => {
    setSelectedBand(band);
    setSelectedAsset(null);
    setSelectedSignal(null);
  };

  const handleSignalClick = (signalId: string) => {
    const signal = SIGNALS.find(s => s.id === signalId);
    setSelectedSignal(signal || null);
    setSelectedBand(null);
    setSelectedAsset(null);
  };

  const handleInspectorClose = () => {
    setSelectedBand(null);
    setSelectedAsset(null);
    setSelectedSignal(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ControlsPanel
        currentDateIndex={currentDateIndex}
        maxDateIndex={MONTHLY_DATES.length - 1}
        currentDate={currentDate}
        isPlaying={isPlaying}
        onDateIndexChange={setCurrentDateIndex}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        entropyThreshold={entropyThreshold}
        onEntropyThresholdChange={setEntropyThreshold}
        selectedKpi={selectedKpi}
        onKpiChange={setSelectedKpi}
        showFedRate={showFedRate}
        onShowFedRateChange={setShowFedRate}
      />

      <EntropyRiver
        data={stackedData}
        currentDateIndex={currentDateIndex}
        onBandClick={handleBandClick}
        selectedBand={selectedBand}
        signals={SIGNALS}
        onSignalClick={handleSignalClick}
        selectedSignal={selectedSignal?.id || null}
        showFedRate={showFedRate}
        fedRates={FED_RATES}
        entropyThreshold={entropyThreshold}
      />

      <InspectorPanel
        selectedBand={selectedBand}
        selectedAsset={selectedAsset}
        selectedSignal={selectedSignal}
        assets={filteredAssets}
        currentDate={currentDate}
        selectedKpi={selectedKpi}
        onSelectAsset={setSelectedAsset}
        onClose={handleInspectorClose}
      />
    </div>
  );
};

export default Index;
