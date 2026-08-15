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

// Wide, deliberately liquidity-agnostic token list — majors, mid-caps, and
// memecoins. Thinner markets are included on purpose because they're more
// likely to show real, larger spreads than heavily-arbitraged majors.
const symbolMap: Record<string, string> = {
  BTC: 'BTC/USDT', ETH: 'ETH/USDT', SOL: 'SOL/USDT', XRP: 'XRP/USDT', ADA: 'ADA/USDT', DOGE: 'DOGE/USDT',
  ZEC: 'ZEC/USDT', CC: 'CC/USDT', RAIN: 'RAIN/USDT',
  LTC: 'LTC/USDT', LINK: 'LINK/USDT', DOT: 'DOT/USDT', AVAX: 'AVAX/USDT', UNI: 'UNI/USDT', ATOM: 'ATOM/USDT',
  NEAR: 'NEAR/USDT', APT: 'APT/USDT', ARB: 'ARB/USDT', OP: 'OP/USDT', INJ: 'INJ/USDT', SEI: 'SEI/USDT',
  SUI: 'SUI/USDT', FIL: 'FIL/USDT', RUNE: 'RUNE/USDT', HBAR: 'HBAR/USDT',
  PEPE: 'PEPE/USDT', SHIB: 'SHIB/USDT', WIF: 'WIF/USDT', BONK: 'BONK/USDT',
}

// Widened on purpose to include smaller/less-arbitraged exchanges — liquidity
// and exchange size are not filtered here per product requirements. This
// means quoted spreads on thin pairs may not be fully fillable at size; see
// the risk banner shown alongside these results in the UI.
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
