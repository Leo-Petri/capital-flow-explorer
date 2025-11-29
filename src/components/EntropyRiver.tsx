import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { StackedData } from '@/lib/aggregation';
import { EntropyBandId, Signal, RatePoint } from '@/data/mockData';

interface EntropyRiverProps {
  data: StackedData[];
  currentDateIndex: number;
  onBandClick: (band: EntropyBandId | null) => void;
  selectedBand: EntropyBandId | null;
  signals: Signal[];
  onSignalClick: (signalId: string) => void;
  selectedSignal: string | null;
  showFedRate: boolean;
  fedRates: RatePoint[];
  entropyThreshold: number;
}

const BAND_COLORS: Record<EntropyBandId, string> = {
  cold: '#8EC9FF',    // Neon blue bright
  mild: '#5FAFEA',    // Neon blue mid
  warm: '#FFC857',    // Keep warm for contrast
  hot: '#F77F00',     // Keep hot for contrast
  very_hot: '#D62828', // Keep very hot for contrast
};

const BAND_ORDER: EntropyBandId[] = ['cold', 'mild', 'warm', 'hot', 'very_hot'];

export function EntropyRiver({
  data,
  currentDateIndex,
  onBandClick,
  selectedBand,
  signals,
  onSignalClick,
  selectedSignal,
  showFedRate,
  fedRates,
  entropyThreshold,
}: EntropyRiverProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = { top: 40, right: 60, bottom: 80, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Define gradients for QPLIX style
    const defs = svg.append('defs');
    
    // Gradient for each band
    BAND_ORDER.forEach(bandId => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${bandId}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');
      
      const baseColor = BAND_COLORS[bandId];
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', baseColor)
        .attr('stop-opacity', 0.50);
      
      gradient.append('stop')
        .attr('offset', '50%')
        .attr('stop-color', baseColor)
        .attr('stop-opacity', 0.25);
      
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', baseColor)
        .attr('stop-opacity', 0.00);
    });

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, innerWidth]);

    const maxValue = d3.max(data, d => d.total) || 1;
    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([innerHeight, 0])
      .nice();

    // Stack generator
    const stack = d3.stack<StackedData>()
      .keys(BAND_ORDER)
      .order(d3.stackOrderNone)
      .offset(d3.stackOffsetNone);

    const series = stack(data);

    // Area generator with smooth curves
    const area = d3.area<d3.SeriesPoint<StackedData>>()
      .x((d, i) => xScale(i))
      .y0(d => yScale(d[0]))
      .y1(d => yScale(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Draw areas with QPLIX gradient style
    const bands = g.append('g')
      .selectAll('path')
      .data(series)
      .join('path')
      .attr('fill', d => `url(#gradient-${d.key})`)
      .attr('d', area)
      .attr('opacity', d => selectedBand === null || selectedBand === d.key ? 1 : 0.3)
      .attr('stroke', d => {
        if (selectedBand === d.key) return '#B9DCFF';
        return BAND_COLORS[d.key as EntropyBandId];
      })
      .attr('stroke-width', d => selectedBand === d.key ? 3 : 2)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease-out')
      .style('filter', d => selectedBand === d.key ? 'drop-shadow(0 0 8px rgba(185, 220, 255, 0.6))' : 'none')
      .on('click', (event, d) => {
        event.stopPropagation();
        onBandClick(d.key as EntropyBandId);
      })
      .on('mouseenter', function(event, d) {
        if (selectedBand === null) {
          d3.select(this)
            .attr('opacity', 1)
            .style('filter', 'brightness(1.1) drop-shadow(0 0 6px rgba(185, 220, 255, 0.4))');
        }
      })
      .on('mouseleave', function(event, d) {
        if (selectedBand === null || selectedBand !== d.key) {
          d3.select(this)
            .attr('opacity', selectedBand === null ? 1 : 0.3)
            .style('filter', selectedBand === d.key ? 'drop-shadow(0 0 8px rgba(185, 220, 255, 0.6))' : 'none');
        }
      });

    // Gridlines (QPLIX style) - draw before areas so they're behind
    const gridGroup = g.append('g')
      .attr('class', 'grid')
      .style('pointer-events', 'none');
    
    // Horizontal gridlines
    gridGroup.append('g')
      .call(d3.axisLeft(yScale)
        .ticks(6)
        .tickSize(-innerWidth)
        .tickFormat(() => '')
      )
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line')
        .attr('stroke', 'rgba(255, 255, 255, 0.06)')
        .attr('stroke-width', 1)
      );

    // Axes with QPLIX colors
    const xAxis = d3.axisBottom(xScale)
      .tickValues(d3.range(0, data.length, 12))
      .tickFormat(i => data[+i]?.date.split('-')[0] || '');

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .call(g => g.select('.domain').attr('stroke', 'rgba(255, 255, 255, 0.15)'))
      .selectAll('text')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', '12px')
      .attr('fill', 'rgba(255, 255, 255, 0.70)');

    const yAxis = d3.axisLeft(yScale)
      .ticks(6)
      .tickFormat(d => d3.format('.2s')(d as number));

    g.append('g')
      .call(yAxis)
      .call(g => g.select('.domain').attr('stroke', 'rgba(255, 255, 255, 0.15)'))
      .call(g => g.selectAll('.tick line').attr('stroke', 'rgba(255, 255, 255, 0.15)'))
      .selectAll('text')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-size', '12px')
      .attr('fill', 'rgba(255, 255, 255, 0.70)');

    // Current date cursor with QPLIX style
    g.append('line')
      .attr('x1', xScale(currentDateIndex))
      .attr('x2', xScale(currentDateIndex))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#4DA3F7')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.8)
      .style('filter', 'drop-shadow(0 0 4px rgba(77, 163, 247, 0.5))');

    // Fed Funds Rate
    if (showFedRate && fedRates.length > 0) {
      const rateScale = d3.scaleLinear()
        .domain([0, d3.max(fedRates, r => r.rate) || 6])
        .range([innerHeight, 0]);

      const rateLine = d3.line<RatePoint>()
        .x(d => {
          const dateIndex = data.findIndex(item => item.date === d.date);
          return dateIndex >= 0 ? xScale(dateIndex) : 0;
        })
        .y(d => rateScale(d.rate))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(fedRates)
        .attr('fill', 'none')
        .attr('stroke', '#10B981')
        .attr('stroke-width', 2)
        .attr('d', rateLine)
        .attr('opacity', 0.9);

      g.selectAll('.rate-dot')
        .data(fedRates)
        .join('circle')
        .attr('class', 'rate-dot')
        .attr('cx', d => {
          const dateIndex = data.findIndex(item => item.date === d.date);
          return dateIndex >= 0 ? xScale(dateIndex) : 0;
        })
        .attr('cy', d => rateScale(d.rate))
        .attr('r', 3)
        .attr('fill', '#10B981')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1);

      // Secondary Y axis for rate
      const rateAxis = d3.axisRight(rateScale)
        .ticks(4)
        .tickFormat(d => `${d}%`);

      g.append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(rateAxis)
        .attr('color', '#10B981')
        .selectAll('text')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-size', '11px');
    }

    // Signal markers
    const signalGroup = g.append('g')
      .attr('transform', `translate(0,${innerHeight + 10})`);

    const SIGNAL_COLORS: Record<string, string> = {
      macro: '#F59E0B',
      geopolitical: '#EF4444',
      rates: '#10B981',
      custom: '#8B5CF6',
    };

    signalGroup.selectAll('.signal-marker')
      .data(signals)
      .join('g')
      .attr('class', 'signal-marker')
      .attr('transform', d => {
        const dateIndex = data.findIndex(item => item.date === d.date);
        return `translate(${dateIndex >= 0 ? xScale(dateIndex) : 0},0)`;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onSignalClick(d.id);
      })
      .each(function(d) {
        const group = d3.select(this);
        
        group.append('circle')
          .attr('r', selectedSignal === d.id ? 6 : 4)
          .attr('fill', SIGNAL_COLORS[d.type])
          .attr('stroke', selectedSignal === d.id ? '#B9DCFF' : 'none')
          .attr('stroke-width', 2)
          .style('filter', selectedSignal === d.id ? 'drop-shadow(0 0 6px rgba(185, 220, 255, 0.6))' : 'none');

        group.append('line')
          .attr('x1', 0)
          .attr('x2', 0)
          .attr('y1', -10)
          .attr('y2', -(innerHeight + 10))
          .attr('stroke', SIGNAL_COLORS[d.type])
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2')
          .attr('opacity', selectedSignal === d.id ? 0.5 : 0.2);
      });

    // Click outside to deselect
    svg.on('click', () => {
      onBandClick(null);
      onSignalClick('');
    });

  }, [data, currentDateIndex, selectedBand, signals, selectedSignal, showFedRate, fedRates, onBandClick, onSignalClick, entropyThreshold]);

  return (
    <div ref={containerRef} className="w-full h-full bg-background">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
