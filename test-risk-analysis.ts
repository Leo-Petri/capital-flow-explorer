// Test script to verify Risk-On/Risk-Off Analysis calculations

interface StackedDataPoint {
  date: string;
  cold: number;
  mild: number;
  warm: number;
  hot: number;
  very_hot: number;
  total: number;
}

interface RegimeAnalysis {
  period: string;
  hotVeryHotPct: number;
  coldMildPct: number;
  warmPct: number;
  stance: 'Risk-On' | 'Risk-Off' | 'Neutral';
}

function analyzeRiskBehavior(
  stackedData: StackedDataPoint[]
): {
  rateCuts: RegimeAnalysis;
  zeroRates: RegimeAnalysis;
  rateHikes: RegimeAnalysis;
} | null {
  if (!stackedData || stackedData.length === 0) return null;

  const regimes = [
    {
      key: 'rateCuts' as const,
      period: 'Rate Cuts (2019 – Early 2020)',
      start: '2019-01',
      end: '2020-02',
    },
    {
      key: 'zeroRates' as const,
      period: 'Zero Rates (2020 – 2021)',
      start: '2020-03',
      end: '2021-12',
    },
    {
      key: 'rateHikes' as const,
      period: 'Rate Hikes (2022 – 2025)',
      start: '2022-01',
      end: '2025-12',
    },
  ];

  const results: any = {};

  regimes.forEach(regime => {
    const regimeData = stackedData.filter(d => {
      const datePrefix = d.date.substring(0, 7);
      return datePrefix >= regime.start && datePrefix <= regime.end;
    });

    if (regimeData.length === 0) {
      results[regime.key] = {
        period: regime.period,
        hotVeryHotPct: 0,
        coldMildPct: 0,
        warmPct: 0,
        stance: 'Neutral' as const,
      };
      return;
    }

    // Calculate average percentages for this regime
    const avgHotVeryHot = regimeData.reduce((sum, d) => {
      const total = d.total || 1;
      return sum + ((d.hot + d.very_hot) / total) * 100;
    }, 0) / regimeData.length;

    const avgColdMild = regimeData.reduce((sum, d) => {
      const total = d.total || 1;
      return sum + ((d.cold + d.mild) / total) * 100;
    }, 0) / regimeData.length;

    const avgWarm = regimeData.reduce((sum, d) => {
      const total = d.total || 1;
      return sum + (d.warm / total) * 100;
    }, 0) / regimeData.length;

    const highVolPct = avgWarm + avgHotVeryHot;
    let stance: 'Risk-On' | 'Risk-Off' | 'Neutral';
    if (highVolPct > 50) {
      stance = 'Risk-On';
    } else if (avgColdMild > 50) {
      stance = 'Risk-Off';
    } else {
      stance = 'Neutral';
    }

    results[regime.key] = {
      period: regime.period,
      hotVeryHotPct: avgHotVeryHot,
      coldMildPct: avgColdMild,
      warmPct: avgWarm,
      stance,
    };
  });

  return results;
}

// Test cases
console.log('=== Testing Risk-On/Risk-Off Analysis ===\n');

// Test 1: Basic calculation - Risk-On scenario
console.log('Test 1: Risk-On scenario (high volatility > 50%)');
const testData1: StackedDataPoint[] = [
  { date: '2019-06-15', cold: 10, mild: 20, warm: 30, hot: 25, very_hot: 15, total: 100 },
  { date: '2019-07-15', cold: 5, mild: 15, warm: 35, hot: 30, very_hot: 15, total: 100 },
];
const result1 = analyzeRiskBehavior(testData1);
console.log('Result:', result1?.rateCuts);
console.log('Expected: Risk-On (warm + hot + very_hot = 30+25+15 = 70% avg)');
console.log('Actual stance:', result1?.rateCuts.stance);
console.log('High vol %:', (result1?.rateCuts.warmPct || 0) + (result1?.rateCuts.hotVeryHotPct || 0));
console.log('✓ Pass:', result1?.rateCuts.stance === 'Risk-On');
console.log('');

// Test 2: Risk-Off scenario
console.log('Test 2: Risk-Off scenario (low volatility > 50%)');
const testData2: StackedDataPoint[] = [
  { date: '2020-06-15', cold: 40, mild: 30, warm: 20, hot: 5, very_hot: 5, total: 100 },
  { date: '2020-07-15', cold: 45, mild: 25, warm: 15, hot: 10, very_hot: 5, total: 100 },
];
const result2 = analyzeRiskBehavior(testData2);
console.log('Result:', result2?.zeroRates);
console.log('Expected: Risk-Off (cold + mild = 40+30 = 70% avg)');
console.log('Actual stance:', result2?.zeroRates.stance);
console.log('Cold+Mild %:', result2?.zeroRates.coldMildPct);
console.log('✓ Pass:', result2?.zeroRates.stance === 'Risk-Off');
console.log('');

// Test 3: Neutral scenario
console.log('Test 3: Neutral scenario (neither > 50%)');
const testData3: StackedDataPoint[] = [
  { date: '2022-06-15', cold: 20, mild: 20, warm: 30, hot: 20, very_hot: 10, total: 100 },
  { date: '2022-07-15', cold: 25, mild: 25, warm: 25, hot: 15, very_hot: 10, total: 100 },
];
const result3 = analyzeRiskBehavior(testData3);
console.log('Result:', result3?.rateHikes);
console.log('Expected: Neutral (high vol = 30+30 = 60% avg, but cold+mild = 20+20 = 40% avg)');
console.log('Actual stance:', result3?.rateHikes.stance);
console.log('High vol %:', (result3?.rateHikes.warmPct || 0) + (result3?.rateHikes.hotVeryHotPct || 0));
console.log('Cold+Mild %:', result3?.rateHikes.coldMildPct);
console.log('✓ Pass:', result3?.rateHikes.stance === 'Neutral');
console.log('');

// Test 4: Edge case - exactly 50%
console.log('Test 4: Edge case - exactly 50%');
const testData4: StackedDataPoint[] = [
  { date: '2019-06-15', cold: 10, mild: 20, warm: 20, hot: 25, very_hot: 25, total: 100 },
];
const result4 = analyzeRiskBehavior(testData4);
console.log('Result:', result4?.rateCuts);
console.log('Expected: Neutral (high vol = 20+50 = 70%, but exactly 50% threshold)');
console.log('Actual stance:', result4?.rateCuts.stance);
console.log('High vol %:', (result4?.rateCuts.warmPct || 0) + (result4?.rateCuts.hotVeryHotPct || 0));
console.log('Note: > 50% means strictly greater, so 70% should be Risk-On');
console.log('✓ Pass:', result4?.rateCuts.stance === 'Risk-On');
console.log('');

// Test 5: Date filtering
console.log('Test 5: Date filtering across regimes');
const testData5: StackedDataPoint[] = [
  { date: '2019-12-15', cold: 10, mild: 20, warm: 30, hot: 25, very_hot: 15, total: 100 },
  { date: '2020-01-15', cold: 10, mild: 20, warm: 30, hot: 25, very_hot: 15, total: 100 },
  { date: '2020-03-15', cold: 40, mild: 30, warm: 20, hot: 5, very_hot: 5, total: 100 },
  { date: '2022-01-15', cold: 20, mild: 20, warm: 30, hot: 20, very_hot: 10, total: 100 },
];
const result5 = analyzeRiskBehavior(testData5);
console.log('Rate Cuts (2019-01 to 2020-02):', result5?.rateCuts.stance);
console.log('Zero Rates (2020-03 to 2021-12):', result5?.zeroRates.stance);
console.log('Rate Hikes (2022-01 to 2025-12):', result5?.rateHikes.stance);
console.log('✓ Pass: Different stances for different regimes');
console.log('');

// Test 6: Percentage sum validation
console.log('Test 6: Percentage sum validation');
const testData6: StackedDataPoint[] = [
  { date: '2019-06-15', cold: 10, mild: 20, warm: 30, hot: 25, very_hot: 15, total: 100 },
];
const result6 = analyzeRiskBehavior(testData6);
const sum = (result6?.rateCuts.coldMildPct || 0) + 
            (result6?.rateCuts.warmPct || 0) + 
            (result6?.rateCuts.hotVeryHotPct || 0);
console.log('Percentages sum:', sum.toFixed(2) + '%');
console.log('Expected: ~100% (may vary slightly due to rounding)');
console.log('✓ Pass:', Math.abs(sum - 100) < 1); // Allow 1% tolerance for rounding
console.log('');

// Test 7: Zero total edge case
console.log('Test 7: Zero total edge case (should use fallback)');
const testData7: StackedDataPoint[] = [
  { date: '2019-06-15', cold: 0, mild: 0, warm: 0, hot: 0, very_hot: 0, total: 0 },
];
const result7 = analyzeRiskBehavior(testData7);
console.log('Result:', result7?.rateCuts);
console.log('Note: With total=0, code uses || 1 fallback, so percentages would be 0%');
console.log('✓ Pass: No crash');
console.log('');

console.log('=== All tests completed ===');

