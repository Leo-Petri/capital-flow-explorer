import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { StackedData } from '@/lib/aggregation';
import { VolatilityBandId, Signal, RatePoint } from '@/data/mockData';

interface VolatilityRiverProps {
  data: StackedData[];
  currentDateIndex: number;
  onBandClick: (band: VolatilityBandId | null) => void;
  selectedBand: VolatilityBandId | null;
  signals: Signal[];
  onSignalClick: (signalId: string) => void;
  selectedSignal: string | null;
  showFedRate: boolean;
  fedRates: RatePoint[];
}

// Heat-map color palette matching volatility levels
const BAND_COLORS: Record<VolatilityBandId, { base: string; light: string; dark: string }> = {
  cold: { base: '#0EA5E9', light: '#38BDF8', dark: '#0284C7' },      // Sky blue
  mild: { base: '#06B6D4', light: '#22D3EE', dark: '#0891B2' },      // Cyan
  warm: { base: '#F59E0B', light: '#FBBF24', dark: '#D97706' },      // Amber/Gold
  hot: { base: '#F97316', light: '#FB923C', dark: '#EA580C' },       // Orange
  very_hot: { base: '#DC2626', light: '#EF4444', dark: '#B91C1C' },  // Red
};

const BAND_ORDER: VolatilityBandId[] = ['cold', 'mild', 'warm', 'hot', 'very_hot'];

export function VolatilityRiver({
  data,
  currentDateIndex,
  onBandClick,
  selectedBand,
  signals,
  onSignalClick,
  selectedSignal,
  showFedRate,
  fedRates,
}: VolatilityRiverProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 40, right: 60, bottom: 100, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates and create time scale with caching
    const dateCache = new Map<string, Date>();
    const parseDate = (dateStr: string): Date => {
      // Check cache first
      if (dateCache.has(dateStr)) {
        return dateCache.get(dateStr)!;
      }
      // Handle both YYYY-MM-DD and YYYY-MM formats
      let parsed: Date;
      if (dateStr.length === 7) {
        parsed = d3.timeParse('%Y-%m')(dateStr) || new Date(dateStr);
      } else {
        parsed = d3.timeParse('%Y-%m-%d')(dateStr) || new Date(dateStr);
      }
      dateCache.set(dateStr, parsed);
      return parsed;
    };

    // Pre-parse all dates once and cache them
    const dates = data.map(d => parseDate(d.date));
    const dateExtent = d3.extent(dates) as [Date, Date];
    
    // Create date-to-index map for O(1) lookups
    const dateToIndexMap = new Map<string, number>();
    data.forEach((d, i) => {
      dateToIndexMap.set(d.date, i);
    });
    
    // Base time scale (full domain)
    const xScaleBase = d3.scaleTime()
      .domain(dateExtent)
      .range([0, innerWidth]);

    // Create zoomable scale
    const xScale = zoomTransformRef.current 
      ? zoomTransformRef.current.rescaleX(xScaleBase)
      : xScaleBase.copy();

    const maxValue = d3.max(data, d => d.total) || 1;
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([innerHeight, 0])
      .nice();

    // QPLIX neon-blue gradient definitions - exact replication
    const defs = svg.append('defs');
    
    // Create modern drop shadow filter for sleek appearance
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');
    
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    
    BAND_ORDER.forEach((band) => {
      const colors = BAND_COLORS[band];
      // Gradient: more opaque at top (near line), more transparent at bottom
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${band}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
      
      // Top (near line): more intense
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', colors.base)
        .attr('stop-opacity', 0.65);
      
      // Middle: medium transparency
      gradient.append('stop')
        .attr('offset', '50%')
        .attr('stop-color', colors.base)
        .attr('stop-opacity', 0.35);
      
      // Bottom: nearly transparent
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', colors.base)
        .attr('stop-opacity', 0.05);
    });

    // Stack generator
    const stack = d3.stack<StackedData>()
      .keys(BAND_ORDER)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(data);

    // Area generator with smooth curves - use cached dates for x position
    const area = d3.area<d3.SeriesPoint<StackedData>>()
      .x((d, i) => {
        // Use pre-parsed dates array instead of parsing again
        return xScale(dates[i]);
      })
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // QPLIX neon-blue areas with modern transparent shading
    const bands = g.append('g')
      .attr('class', 'bands')
      .selectAll('path')
      .data(series)
      .join('path')
      .attr('fill', d => `url(#gradient-${d.key})`)
      .attr('d', area)
      .attr('opacity', d => selectedBand === null || selectedBand === d.key ? 1 : 0.25)
      .attr('stroke', d => {
        if (selectedBand === d.key) return '#ffffff';
        return BAND_COLORS[d.key as VolatilityBandId].light;
      })
      .attr('stroke-width', d => selectedBand === d.key ? 3 : 2.5)
      .attr('stroke-opacity', d => selectedBand === d.key ? 1 : 0.8)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('filter', 'url(#glow)')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)')
      .on('click', (event, d) => {
        event.stopPropagation();
        onBandClick(d.key as VolatilityBandId);
      })
      .on('mouseenter', function(event, d) {
        if (selectedBand === null) {
          d3.select(this)
            .attr('opacity', 1)
            .attr('stroke-width', 3)
            .attr('stroke-opacity', 1);
        }
      })
      .on('mouseleave', function(event, d) {
        if (selectedBand === null || selectedBand !== d.key) {
          d3.select(this)
            .attr('opacity', selectedBand === null ? 1 : 0.25)
            .attr('stroke-width', selectedBand === null ? 2.5 : 2.5)
            .attr('stroke-opacity', selectedBand === null ? 0.8 : 0.8);
        }
      });

    // Dynamic x-axis formatter based on zoom level
    const getXAxisFormat = (scale: d3.ScaleTime<number, number>) => {
      const domain = scale.domain();
      const range = domain[1].getTime() - domain[0].getTime();
      const days = range / (1000 * 60 * 60 * 24);
      
      if (days <= 60) {
        // Show days when zoomed in
        return d3.timeFormat('%b %d');
      } else if (days <= 365) {
        // Show months when medium zoom
        return d3.timeFormat('%b %Y');
      } else {
        // Show years when zoomed out
        return d3.timeFormat('%Y');
      }
    };

    // X-axis with dynamic formatting
    const xAxisGroup = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`);

    const updateXAxis = (scale: d3.ScaleTime<number, number>) => {
      const format = getXAxisFormat(scale);
      const domain = scale.domain();
      const range = domain[1].getTime() - domain[0].getTime();
      const days = range / (1000 * 60 * 60 * 24);
      
      // Adaptive tick count based on zoom level and width
      const tickCount = days <= 60 
        ? Math.min(innerWidth / 60, 20) // More ticks when zoomed in
        : Math.min(innerWidth / 100, 12); // Fewer ticks when zoomed out
      
      const xAxis = d3.axisBottom(scale)
        .ticks(tickCount)
        .tickFormat(format);

      xAxisGroup
        .call(xAxis)
        .call(g => g.select('.domain').attr('stroke', 'rgba(255, 255, 255, 0.06)'))
        .call(g => g.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.06)'))
        .selectAll('text')
        .attr('fill', 'rgba(255, 255, 255, 0.55)')
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-size', '10px')
        .attr('font-weight', '400')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');
    };

    updateXAxis(xScale);

    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d => d3.format('.2s')(d as number));

    // Y-axis with subtle gridlines
    const yAxisGroup = g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .call(g => g.select('.domain').attr('stroke', 'rgba(255, 255, 255, 0.06)'))
      .call(g => g.selectAll('.tick line')
        .attr('stroke', 'rgba(255, 255, 255, 0.06)')
        .attr('stroke-width', 1)
        .attr('x2', innerWidth)) // Extend gridlines across chart
      .selectAll('text')
      .attr('fill', 'rgba(255, 255, 255, 0.55)')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '10px')
      .attr('font-weight', '400');

    // Current date cursor with QPLIX accent color
    const currentDate = dates[currentDateIndex] || dates[0];
    const cursorX = xScale(currentDate);
    
    g.append('line')
      .attr('class', 'current-date-cursor')
      .attr('x1', cursorX)
      .attr('x2', cursorX)
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#4DA3F7')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,6')
      .attr('opacity', 0.8)
      .attr('filter', 'url(#glow)');

    // Add triangle markers at the ends of the cursor line
    const triangleSize = 6;
    
    // Top triangle (pointing down/inward)
    g.append('polygon')
      .attr('class', 'cursor-marker-top')
      .attr('points', `${cursorX},${triangleSize} ${cursorX - triangleSize},0 ${cursorX + triangleSize},0`)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', '#4DA3F7')
      .attr('stroke-width', 1)
      .attr('opacity', 0.9);
    
    // Bottom triangle (pointing up/inward)
    g.append('polygon')
      .attr('class', 'cursor-marker-bottom')
      .attr('points', `${cursorX},${innerHeight - triangleSize} ${cursorX - triangleSize},${innerHeight} ${cursorX + triangleSize},${innerHeight}`)
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('stroke', '#4DA3F7')
      .attr('stroke-width', 1)
      .attr('opacity', 0.9);

    // Fed Funds Rate - pre-compute valid rate points for use in zoom handler
    let validRatePoints: (RatePoint & { date: Date; dateIndex: number })[] = [];
    if (showFedRate && fedRates.length > 0) {
      // Create a Map for efficient date lookup: key = date prefix (YYYY-MM)
      const dateIndexMap = new Map<string, number>();
      data.forEach((item, index) => {
        const datePrefix = item.date.substring(0, 7); // Extract YYYY-MM
        if (!dateIndexMap.has(datePrefix)) {
          dateIndexMap.set(datePrefix, index);
        }
      });

      // Filter rate points to only include those with valid date matches
      // Use pre-parsed dates from cache
      validRatePoints = fedRates
        .map(rate => {
          const dateIndex = dateIndexMap.get(rate.date);
          if (dateIndex !== undefined) {
            const date = dates[dateIndex]; // Use pre-parsed date
            return { ...rate, date, dateIndex };
          }
          return null;
        })
        .filter((point): point is RatePoint & { date: Date; dateIndex: number } => point !== null);

      if (validRatePoints.length > 0) {
        const rateScale = d3.scaleLinear()
          .domain([0, d3.max(validRatePoints, r => r.rate) || 6])
          .range([innerHeight, 0]);

        const rateLine = d3.line<RatePoint & { date: Date; dateIndex: number }>()
          .x(d => xScale(d.date))
          .y(d => rateScale(d.rate))
          .curve(d3.curveMonotoneX)
          .defined(() => true);

        g.append('path')
          .attr('class', 'rate-line')
          .datum(validRatePoints)
          .attr('fill', 'none')
          .attr('stroke', '#D4A017')  // Deep darker yellow/gold
          .attr('stroke-width', 2.5)
          .attr('d', rateLine)
          .attr('opacity', 0.85)
          .attr('filter', 'url(#glow)');

        // Glowing dots
        g.selectAll('.rate-dot')
          .data(validRatePoints)
          .join('circle')
          .attr('class', 'rate-dot')
          .attr('cx', d => xScale(d.date))
          .attr('cy', d => rateScale(d.rate))
          .attr('r', 3.5)
          .attr('fill', '#F4D03F')
          .attr('stroke', '#D4A017')
          .attr('stroke-width', 2)
          .attr('filter', 'url(#glow)')
          .style('box-shadow', '0px 0px 6px rgba(212,160,23,0.6)');

        // Secondary Y axis for rate
        const rateAxis = d3.axisRight(rateScale)
          .ticks(4)
          .tickFormat(d => `${d}%`);

        g.append('g')
          .attr('class', 'rate-axis')
          .attr('transform', `translate(${innerWidth},0)`)
          .call(rateAxis)
          .call(g => g.select('.domain').attr('stroke', 'rgba(212, 160, 23, 0.2)'))
          .call(g => g.selectAll('.tick line').attr('stroke', 'rgba(212, 160, 23, 0.15)'))
          .selectAll('text')
          .attr('fill', '#D4A017')
          .attr('font-family', 'Inter, sans-serif')
          .attr('font-size', '10px')
          .attr('font-weight', '400');
      }
    }

    // Signal markers - pre-compute signal positions for better performance
    const signalGroup = g.append('g')
      .attr('class', 'signal-markers')
      .attr('transform', `translate(0,${innerHeight + 10})`);

    const SIGNAL_COLORS: Record<string, string> = {
      macro: '#F59E0B',
      geopolitical: '#EF4444',
      rates: '#10B981',
      custom: '#8B5CF6',
      green: '#22C55E',   // Green for positive/good news
      red: '#EF4444',     // Red for negative/bad news
      gray: '#F97316',    // Orange for neutral news
    };

    // Pre-compute signal positions using Map lookups instead of find()
    const signalPositions = signals.map(signal => {
      // Try exact date match first (O(1))
      const exactIndex = dateToIndexMap.get(signal.date);
      if (exactIndex !== undefined) {
        return { signal, x: xScale(dates[exactIndex]), valid: true };
      }
      
      // Try prefix match (for YYYY-MM format signals matching YYYY-MM-DD data)
      // Find first data point that starts with signal date
      let matchedIndex = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i].date.startsWith(signal.date) || signal.date.startsWith(data[i].date)) {
          matchedIndex = i;
          break;
        }
      }
      
      if (matchedIndex >= 0) {
        return { signal, x: xScale(dates[matchedIndex]), valid: true };
      }
      
      return { signal, x: 0, valid: false };
    });

    signalGroup.selectAll('.signal-marker')
      .data(signalPositions)
      .join('g')
      .attr('class', 'signal-marker')
      .attr('transform', d => d.valid ? `translate(${d.x},0)` : `translate(0,0)`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onSignalClick(d.signal.id);
      })
      .each(function(d) {
        if (!d.valid) return; // Skip invalid signals
        
        const group = d3.select(this);
        const isSelected = selectedSignal === d.signal.id;
        const color = SIGNAL_COLORS[d.signal.type];
        
        group.append('circle')
          .attr('r', isSelected ? 7 : 5)
          .attr('fill', color)
          .attr('stroke', isSelected ? '#ffffff' : color)
          .attr('stroke-width', isSelected ? 2.5 : 1.5)
          .attr('filter', 'url(#glow)')
          .style('cursor', 'pointer');

        group.append('line')
          .attr('x1', 0)
          .attr('x2', 0)
          .attr('y1', -10)
          .attr('y2', -(innerHeight + 10))
          .attr('stroke', color)
          .attr('stroke-width', isSelected ? 2 : 1)
          .attr('stroke-dasharray', '3,3')
          .attr('opacity', isSelected ? 0.6 : 0.3)
          .style('cursor', 'pointer');
      });

    // Zoom behavior with constraints
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 20]) // Allow more zoom range: 0.5x (zoom out) to 20x (zoom in)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
      .wheelDelta((event) => {
        // Reduce wheel sensitivity - make scrolling 4x less aggressive for smoother control
        // Default d3 behavior: -event.deltaY * (deltaMode === 1 ? 0.05 : deltaMode === 2 ? 1 : 0.002)
        const defaultDelta = -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode === 2 ? 1 : 0.002);
        return defaultDelta / 4; // Divide by 4 to reduce sensitivity
      })
      .filter((event) => {
        // Allow zoom on wheel, but prevent it on touchpad pinch gestures that are too fast
        if (event.type === 'wheel') {
          return !event.ctrlKey; // Let browser handle ctrl+wheel for accessibility
        }
        return true;
      })
      .constrain((transform, extent) => {
        // Custom constraint to prevent zooming/panning beyond reasonable bounds
        // This ensures we don't pan outside the data range on the x-axis
        const [x0, y0] = extent[0];
        const [x1, y1] = extent[1];
        const extentWidth = x1 - x0;
        const extentHeight = y1 - y0;
        
        // Constrain scale to the defined extent
        const scale = Math.max(0.5, Math.min(20, transform.k));
        
        // Constrain x translation to prevent panning beyond data bounds
        // When zoomed in, we can pan but not beyond the original extent boundaries
        const maxTx = x1 - extentWidth * scale; // Rightmost allowed position
        const minTx = x0 - extentWidth * (scale - 1); // Leftmost allowed position
        const tx = Math.max(minTx, Math.min(maxTx, transform.x));
        
        // For y-axis: prevent vertical panning (keep y at 0)
        // This keeps the chart vertically centered
        const ty = 0;
        
        return d3.zoomIdentity.translate(tx, ty).scale(scale);
      })
      .on('zoom', (event) => {
        const newXScale = event.transform.rescaleX(xScaleBase);
        zoomTransformRef.current = event.transform;
        
        // Update areas - use pre-parsed dates array
        const updatedArea = d3.area<d3.SeriesPoint<StackedData>>()
          .x((d, i) => {
            // Use pre-parsed dates instead of parsing again
            return newXScale(dates[i]);
          })
          .y0(d => yScale(d[0]))
          .y1(d => yScale(d[1]))
          .curve(d3.curveCatmullRom.alpha(0.5));

        bands.attr('d', updatedArea);

        // Update x-axis
        updateXAxis(newXScale);

        // Update current date cursor
        const newCursorX = newXScale(currentDate);
        g.select('.current-date-cursor')
          .attr('x1', newCursorX)
          .attr('x2', newCursorX);

        // Update triangle markers
        g.select('.cursor-marker-top')
          .attr('points', `${newCursorX},${triangleSize} ${newCursorX - triangleSize},0 ${newCursorX + triangleSize},0`);
        
        g.select('.cursor-marker-bottom')
          .attr('points', `${newCursorX},${innerHeight - triangleSize} ${newCursorX - triangleSize},${innerHeight} ${newCursorX + triangleSize},${innerHeight}`);

        // Update Fed rate line and dots
        if (showFedRate && fedRates.length > 0 && validRatePoints.length > 0) {
          // Pre-compute rate scale once
          const maxRate = d3.max(fedRates, r => r.rate) || 6;
          const rateScale = d3.scaleLinear()
            .domain([0, maxRate])
            .range([innerHeight, 0]);
          
          const rateLine = d3.line<RatePoint & { date: Date; dateIndex: number }>()
            .x(d => newXScale(d.date))
            .y(d => rateScale(d.rate))
            .curve(d3.curveMonotoneX);

          g.select('.rate-line').attr('d', rateLine);
          
          g.selectAll<SVGCircleElement, RatePoint & { date: Date; dateIndex: number }>('.rate-dot')
            .attr('cx', d => newXScale(d.date));
        }

        // Update signal markers - use pre-computed positions
        signalGroup.selectAll<SVGGElement, { signal: Signal; x: number; valid: boolean }>('.signal-marker')
          .attr('transform', d => {
            if (!d.valid) return `translate(0,0)`;
            // Use cached date from pre-computed positions
            const exactIndex = dateToIndexMap.get(d.signal.date);
            if (exactIndex !== undefined) {
              return `translate(${newXScale(dates[exactIndex])},0)`;
            }
            // Fallback: parse date if not found in cache
            const signalDate = parseDate(d.signal.date);
            if (signalDate >= dateExtent[0] && signalDate <= dateExtent[1]) {
              return `translate(${newXScale(signalDate)},0)`;
            }
            return `translate(0,0)`;
          });
      });

    svg.call(zoom);

    // Reapply zoom transform if it exists (preserve zoom state across re-renders)
    if (zoomTransformRef.current) {
      svg.call(zoom.transform, zoomTransformRef.current);
    }

    // Add double-click to reset zoom
    svg.on('dblclick.zoom', () => {
      zoomTransformRef.current = null;
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });

    // Click outside to deselect
    svg.on('click', (event) => {
      // Only deselect if clicking on the background, not on elements
      if ((event.target as Element).tagName === 'svg' || (event.target as Element).tagName === 'rect') {
        onBandClick(null);
        onSignalClick('');
      }
    });

  }, [data, currentDateIndex, selectedBand, signals, selectedSignal, showFedRate, fedRates, onBandClick, onSignalClick]);

  return (
    <div ref={containerRef} className="w-full h-full bg-transparent rounded-lg">
      <svg ref={svgRef} className="w-full h-full" style={{ background: 'transparent' }} />
    </div>
  );
}
