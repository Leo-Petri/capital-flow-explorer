import { useState, useEffect, useMemo } from "react";
import { ControlsPanel } from "@/components/ControlsPanel";
import { VolatilityRiver } from "@/components/VolatilityRiver";
import { InspectorPanel } from "@/components/InspectorPanel";
import {
  loadClientData,
  loadSignalsFromCSV,
  FED_RATES,
  KpiId,
  VolatilityBandId,
  Asset,
  Signal,
} from "@/data/mockData";
import { aggregateByVolatilityBand } from "@/lib/aggregation";

const Index = () => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [portfolioData, setPortfolioData] = useState<{
    MONTHLY_DATES: string[];
    ASSETS: Asset[];
    ASSET_KPI_DATA: any[];
  } | null>(null);

  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [filterMode, setFilterMode] = useState<"all" | "liquid" | "illiquid">(
    "all"
  );
  const [selectedKpi, setSelectedKpi] = useState<KpiId>("nav");
  const [showFedRate, setShowFedRate] = useState(true);
  const [selectedBand, setSelectedBand] = useState<VolatilityBandId | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);

  // Load client data and signals on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load portfolio data and signals in parallel
        const [data, loadedSignals] = await Promise.all([
          loadClientData(),
          loadSignalsFromCSV(),
        ]);
        
        console.log("✅ Portfolio data loaded:", {
          assetsCount: data.ASSETS.length,
          datesCount: data.MONTHLY_DATES.length,
          kpiDataCount: data.ASSET_KPI_DATA.length,
          firstAsset: data.ASSETS[0],
          dateRange: `${data.MONTHLY_DATES[0]} to ${
            data.MONTHLY_DATES[data.MONTHLY_DATES.length - 1]
          }`,
        });
        
        console.log("✅ Signals loaded:", {
          signalsCount: loadedSignals.length,
          dateRange: loadedSignals.length > 0 
            ? `${loadedSignals[0].date} to ${loadedSignals[loadedSignals.length - 1].date}`
            : 'N/A',
        });
        
        setPortfolioData(data);
        setSignals(loadedSignals);
        setDataLoaded(true);
      } catch (err) {
        console.error("❌ Failed to load data:", err);
        // Show error to user
        alert("Failed to load data. Please refresh the page.");
      }
    };
    
    loadData();
  }, []);

  // Get data with safe defaults
  const MONTHLY_DATES = portfolioData?.MONTHLY_DATES || [];
  const ASSETS = portfolioData?.ASSETS || [];
  const ASSET_KPI_DATA = portfolioData?.ASSET_KPI_DATA || [];
  const currentDate = MONTHLY_DATES[currentDateIndex];

  // Filter assets based on mode
  const filteredAssets = useMemo(() => {
    let filtered = [...ASSETS];

    if (filterMode === "liquid") {
      filtered = filtered.filter((a) => a.isLiquid);
    } else if (filterMode === "illiquid") {
      filtered = filtered.filter((a) => !a.isLiquid);
    }

    return filtered;
  }, [ASSETS, filterMode]);

  // Aggregate data for visualization
  const stackedData = useMemo(() => {
    const data = aggregateByVolatilityBand(
      filteredAssets,
      ASSET_KPI_DATA,
      selectedKpi,
      MONTHLY_DATES
    );
    console.log("📊 Stacked data:", {
      length: data.length,
      firstDate: data[0]?.date,
      bands: data[0] ? Object.keys(data[0]).filter((k) => k !== "date") : [],
      sample: data[0],
    });
    return data;
  }, [filteredAssets, ASSET_KPI_DATA, selectedKpi, MONTHLY_DATES]);

  // Play/pause animation (slower for daily data)
  useEffect(() => {
    if (!isPlaying || MONTHLY_DATES.length === 0) return;

    const interval = setInterval(() => {
      setCurrentDateIndex((prev) => {
        if (prev >= MONTHLY_DATES.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 50); // Faster interval for daily data, but can be adjusted

    return () => clearInterval(interval);
  }, [isPlaying, MONTHLY_DATES.length]);

  // Show loading state without early return to preserve hook order
  if (!dataLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-lg text-muted-foreground">
            Loading portfolio data...
          </p>
        </div>
      </div>
    );
  }

  const handleBandClick = (band: VolatilityBandId | null) => {
    setSelectedBand(band);
    setSelectedAsset(null);
    setSelectedSignal(null);
  };

  const handleSignalClick = (signalId: string) => {
    const signal = signals.find((s) => s.id === signalId);
    // Toggle: if clicking the same signal, deselect it
    if (selectedSignal?.id === signalId) {
      setSelectedSignal(null);
    } else {
      setSelectedSignal(signal || null);
    }
    // Don't clear band/asset when clicking signals
  };

  const handleInspectorClose = () => {
    setSelectedBand(null);
    setSelectedAsset(null);
    setSelectedSignal(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: '#0D1117' }}>
      {/* Left Panel - Controls */}
      <div className="w-80 flex-shrink-0">
        <ControlsPanel
          currentDateIndex={currentDateIndex}
          maxDateIndex={MONTHLY_DATES.length - 1}
          currentDate={currentDate}
          isPlaying={isPlaying}
          onDateIndexChange={setCurrentDateIndex}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          selectedKpi={selectedKpi}
          onKpiChange={setSelectedKpi}
          showFedRate={showFedRate}
          onShowFedRateChange={setShowFedRate}
        />
      </div>

      {/* Center Panel - Visualization */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full h-full bg-[#111827] rounded-none border border-[#1F2937] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6">
          <VolatilityRiver
            data={stackedData}
            currentDateIndex={currentDateIndex}
            onBandClick={handleBandClick}
            selectedBand={selectedBand}
            signals={signals}
            onSignalClick={handleSignalClick}
            selectedSignal={selectedSignal?.id || null}
            showFedRate={showFedRate}
            fedRates={FED_RATES}
          />
        </div>
      </div>

      {/* Right Panel - Inspector */}
      <div className="w-96 flex-shrink-0">
        <InspectorPanel
          selectedBand={selectedBand}
          selectedAsset={selectedAsset}
          selectedSignal={selectedSignal}
          assets={filteredAssets}
          allAssets={ASSETS}
          currentDate={currentDate || MONTHLY_DATES[0] || ''}
          selectedKpi={selectedKpi}
          onSelectAsset={setSelectedAsset}
          onClose={handleInspectorClose}
          monthlyDates={MONTHLY_DATES}
          assetKpiData={ASSET_KPI_DATA}
          stackedData={stackedData}
        />
      </div>
    </div>
  );
};

export default Index;
