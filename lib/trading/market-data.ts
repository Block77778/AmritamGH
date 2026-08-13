import ccxt from 'ccxt'

export type Candle = { timestamp: number; open: number; high: number; low: number; close: number; volume: number }

export async function getOHLCV(exchangeId: string, symbol: string, timeframe: string = '15m', limit: number = 50): Promise<Candle[]> {
  const ExchangeClass = (ccxt as any)[exchangeId]
  if (!ExchangeClass) throw new Error(`Unsupported exchange: ${exchangeId}`)
  const exchange = new ExchangeClass({ enableRateLimit: true })
  const raw = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit)
  return raw.map(([timestamp, open, high, low, close, volume]: number[]) => ({ timestamp, open, high, low, close, volume }))
}
