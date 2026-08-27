'use server'

import { fetchQuote } from '@/lib/trading/exchange-adapter'

export interface SwapPriceData {
  token: string
  buyExchange: string
  buyPrice: number
  sellExchange: string
  sellPrice: number
  spread: number
  spreadPercentage: number
  profit: number
  profitPercentage: number
  volume24h: number | null
  timestamp: number
  source: 'live-order-book'
}

const symbolMap: Record<string, string> = {
  BTC: 'BTC/USDT', ETH: 'ETH/USDT', SOL: 'SOL/USDT', XRP: 'XRP/USDT', ADA: 'ADA/USDT', DOGE: 'DOGE/USDT',
  ZEC: 'ZEC/USDT', CC: 'CC/USDT', RAIN: 'RAIN/USDT',
  LTC: 'LTC/USDT', LINK: 'LINK/USDT', DOT: 'DOT/USDT', AVAX: 'AVAX/USDT', UNI: 'UNI/USDT', ATOM: 'ATOM/USDT',
  NEAR: 'NEAR/USDT', APT: 'APT/USDT', ARB: 'ARB/USDT', OP: 'OP/USDT', INJ: 'INJ/USDT', SEI: 'SEI/USDT',
  SUI: 'SUI/USDT', FIL: 'FIL/USDT', RUNE: 'RUNE/USDT', HBAR: 'HBAR/USDT',
  PEPE: 'PEPE/USDT', SHIB: 'SHIB/USDT', WIF: 'WIF/USDT', BONK: 'BONK/USDT',
  DEXE: 'DEXE/USDT',
}

const PRICE_SOURCE_EXCHANGES = ['binance', 'kraken', 'coinbase', 'okx', 'bybit', 'kucoin', 'htx', 'mexc']

export async function fetchSwapPrices(token: string): Promise<SwapPriceData | null> {
  const symbol = symbolMap[token.toUpperCase()]
  if (!symbol) return null
  const results = await Promise.allSettled(
    PRICE_SOURCE_EXCHANGES.map((exchangeId) => fetchQuote(exchangeId, symbol)),
  )
  const quotes = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  if (quotes.length < 2) return null

  const buy = quotes.reduce((best, quote) => quote.ask < best.ask ? quote : best)
  const sell = quotes.reduce((best, quote) => quote.bid > best.bid ? quote : best)
  if (sell.bid <= buy.ask) return null

  const spread = sell.bid - buy.ask
  const buyFeeRate = buy.takerFee ?? 0.001
  const sellFeeRate = sell.takerFee ?? 0.001
  const buyFeeCost = buy.ask * buyFeeRate
  const sellFeeCost = sell.bid * sellFeeRate
  const profit = spread - buyFeeCost - sellFeeCost
  const volume24h = buy.quoteVolume24h && sell.quoteVolume24h
    ? Math.max(buy.quoteVolume24h, sell.quoteVolume24h)
    : (buy.quoteVolume24h ?? sell.quoteVolume24h ?? null)

  return {
    token: token.toUpperCase(), buyExchange: buy.exchangeId, buyPrice: buy.ask,
    sellExchange: sell.exchangeId, sellPrice: sell.bid, spread,
    spreadPercentage: (spread / buy.ask) * 100, profit, profitPercentage: (profit / buy.ask) * 100,
    volume24h,
    timestamp: Math.min(buy.timestamp, sell.timestamp), source: 'live-order-book',
  }
}

// Shared short-lived cache — concurrent visitors within this window get the
// same already-computed scan instead of each triggering their own full pass
// across every token and exchange.
const SCAN_CACHE_TTL_MS = 20_000
let scanCache: { data: SwapPriceData[]; cachedAt: number } | null = null

export async function fetchAllTokenPrices() {
  return scanAllOpportunities()
}

export async function scanAllOpportunities() {
  if (scanCache && Date.now() - scanCache.cachedAt < SCAN_CACHE_TTL_MS) {
    return scanCache.data
  }
  const tokens = Object.keys(symbolMap)
  const results = await Promise.all(tokens.map(fetchSwapPrices))
  const data = results.filter((result): result is SwapPriceData => result !== null)
  scanCache = { data, cachedAt: Date.now() }
  return data
}

export async function fetchTokenQuotes(token: string) {
  const symbol = symbolMap[token.toUpperCase()]
  if (!symbol) return []
  const results = await Promise.allSettled(
    PRICE_SOURCE_EXCHANGES.map((exchangeId) => fetchQuote(exchangeId, symbol)),
  )
  return results.flatMap((result) => {
    if (result.status !== 'fulfilled') return []
    const quote = result.value
    return [{
      exchange: quote.exchangeId,
      symbol: quote.symbol,
      price: (quote.bid + quote.ask) / 2,
      bid: quote.bid,
      ask: quote.ask,
      liquidity: quote.bidVolume && quote.askVolume ? Math.min(quote.bidVolume, quote.askVolume) : undefined,
      timestamp: quote.timestamp,
    }]
  })
}
