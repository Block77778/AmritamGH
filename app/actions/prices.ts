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
  timestamp: number
  source: 'live-order-book'
}

const symbolMap: Record<string, string> = {
  BTC: 'BTC/USDT', ETH: 'ETH/USDT', SOL: 'SOL/USDT', XRP: 'XRP/USDT', ADA: 'ADA/USDT', DOGE: 'DOGE/USDT',
}

// Curated list of liquid exchanges that reliably quote these pairs without
// API keys. Querying ccxt's full exchange list (100+) is slow, unreliable
// (most don't list these exact pairs) and risks rate limits/IP bans across
// dozens of exchanges at once.
const PRICE_SOURCE_EXCHANGES = ['binance', 'kraken', 'coinbase', 'okx', 'bybit', 'kucoin']

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
  const feeRate = (buy.takerFee ?? 0.001) + (sell.takerFee ?? 0.001)
  const profit = spread - spread * feeRate
  return {
    token: token.toUpperCase(), buyExchange: buy.exchangeId, buyPrice: buy.ask,
    sellExchange: sell.exchangeId, sellPrice: sell.bid, spread,
    spreadPercentage: (spread / buy.ask) * 100, profit, profitPercentage: (profit / buy.ask) * 100,
    timestamp: Math.min(buy.timestamp, sell.timestamp), source: 'live-order-book',
  }
}

export async function fetchAllTokenPrices() {
  const tokens = Object.keys(symbolMap)
  const results = await Promise.all(tokens.map(fetchSwapPrices))
  return results.filter((result): result is SwapPriceData => result !== null)
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
