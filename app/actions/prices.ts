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
}

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

export async function fetchAllTokenPrices() {
  const tokens = Object.keys(symbolMap)
  const results = await Promise.all(tokens.map(fetchSwapPrices))
  return results.filter((result): result is SwapPriceData => result !== null)
}

export async function scanAllOpportunities() {
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
