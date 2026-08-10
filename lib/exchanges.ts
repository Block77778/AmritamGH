export interface ExchangePrice {
  exchange: string
  symbol: string
  price: number
  bid?: number
  ask?: number
  liquidity?: number
  volume24h?: number
  timestamp: number
}

// Calculate arbitrage opportunity from a set of live prices
// (prices should come from lib/trading/exchange-adapter.ts via fetchQuote/fetchTokenQuotes,
// which pulls real bid/ask data through ccxt — not from this file)
export function calculateArbitrage(prices: ExchangePrice[]) {
  if (prices.length < 2) return null

  const lowest = prices.reduce((min, p) => ((p.ask ?? p.price) < (min.ask ?? min.price) ? p : min))
  const highest = prices.reduce((max, p) => ((p.bid ?? p.price) > (max.bid ?? max.price) ? p : max))
  const buyPrice = lowest.ask ?? lowest.price
  const sellPrice = highest.bid ?? highest.price
  if (lowest.exchange === highest.exchange || sellPrice <= buyPrice) return null

  const profitPercentage = ((sellPrice - buyPrice) / buyPrice) * 100
  const profitPerUnit = sellPrice - buyPrice

  return {
    buyFrom: lowest.exchange,
    buyPrice,
    sellTo: highest.exchange,
    sellPrice,
    profitPercentage,
    profitPerUnit,
    minPriceGap: profitPercentage > 1, // Meaningful arbitrage if > 1% difference
  }
}
