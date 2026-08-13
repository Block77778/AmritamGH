export type Signal = 'buy' | 'sell' | 'hold'

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null
  const slice = values.slice(values.length - period)
  return slice.reduce((sum, v) => sum + v, 0) / period
}

// Simple moving-average crossover: fast MA crossing above slow MA = buy,
// crossing below = sell. This is a common textbook baseline, not a proven
// edge — it has not been backtested against historical data and will lose
// money in choppy/ranging markets. The stop-loss/take-profit in
// directional-bot.ts is what actually bounds the downside, not this signal.
export function computeCrossoverSignal(closes: number[], fastPeriod: number, slowPeriod: number): Signal {
  if (closes.length < slowPeriod + 1) return 'hold'
  const fastNow = sma(closes, fastPeriod)
  const slowNow = sma(closes, slowPeriod)
  const fastPrev = sma(closes.slice(0, -1), fastPeriod)
  const slowPrev = sma(closes.slice(0, -1), slowPeriod)
  if (fastNow === null || slowNow === null || fastPrev === null || slowPrev === null) return 'hold'
  if (fastPrev <= slowPrev && fastNow > slowNow) return 'buy'
  if (fastPrev >= slowPrev && fastNow < slowNow) return 'sell'
  return 'hold'
}
