import { useState, useEffect, useMemo } from 'react';
import { ControlsPanel } from '@/components/ControlsPanel';
import { EntropyRiver } from '@/components/EntropyRiver';
import { InspectorPanel } from '@/components/InspectorPanel';
import { loadClientData, SIGNALS, FED_RATES, KpiId, EntropyBandId, Asset, Signal } from '@/data/mockData';
import { aggregateByEntropyBand } from '@/lib/aggregation';

const Index = () => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [portfolioData, setPortfolioData] = useState<{
    MONTHLY_DATES: string[];
    ASSETS: Asset[];
    ASSET_KPI_DATA: any[];
  } | null>(null);
  
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'liquid' | 'illiquid'>('all');
  const [entropyThreshold, setEntropyThreshold] = useState(0);
  const [selectedKpi, setSelectedKpi] = useState<KpiId>('nav');
  const [showFedRate, setShowFedRate] = useState(true);
  const [selectedBand, setSelectedBand] = useState<EntropyBandId | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);

  // Load client data on mount
  useEffect(() => {
    loadClientData().then(data => {
      console.log('✅ Portfolio data loaded:', {
        assetsCount: data.ASSETS.length,
        datesCount: data.MONTHLY_DATES.length,
        kpiDataCount: data.ASSET_KPI_DATA.length,
        firstAsset: data.ASSETS[0],
        dateRange: `${data.MONTHLY_DATES[0]} to ${data.MONTHLY_DATES[data.MONTHLY_DATES.length - 1]}`
      });
      setPortfolioData(data);
      setDataLoaded(true);
    }).catch(err => {
      console.error('❌ Failed to load portfolio data:', err);
    });
  }, []);

  // Get data with safe defaults
  const MONTHLY_DATES = portfolioData?.MONTHLY_DATES || [];
  const ASSETS = portfolioData?.ASSETS || [];
  const ASSET_KPI_DATA = portfolioData?.ASSET_KPI_DATA || [];
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
  }, [ASSETS, filterMode]);

  // Aggregate data for visualization
  const stackedData = useMemo(() => {
    const data = aggregateByEntropyBand(filteredAssets, ASSET_KPI_DATA, selectedKpi, MONTHLY_DATES);
    console.log('📊 Stacked data:', {
      length: data.length,
      firstDate: data[0]?.date,
      bands: data[0] ? Object.keys(data[0]).filter(k => k !== 'date') : [],
      sample: data[0]
    });
    return data;
  }, [filteredAssets, ASSET_KPI_DATA, selectedKpi, MONTHLY_DATES]);

  // Play/pause animation
  useEffect(() => {
    if (!isPlaying || MONTHLY_DATES.length === 0) return;
    
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
  }, [isPlaying, MONTHLY_DATES.length]);

  // Show loading state without early return to preserve hook order
  if (!dataLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-lg text-muted-foreground">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

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
        monthlyDates={MONTHLY_DATES}
        assetKpiData={ASSET_KPI_DATA}
      />
    </div>
  );
};

export default Index;
