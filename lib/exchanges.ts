import axios from 'axios'

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

// CoinGecko API - Free price data
export async function getCoinGeckoPrices(tokenIds: string[]): Promise<ExchangePrice[]> {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: tokenIds.join(','),
        vs_currencies: 'usd',
        include_market_cap: 'true',
        include_24hr_vol: 'true',
      },
    })

    const prices: ExchangePrice[] = []
    for (const [tokenId, data] of Object.entries(response.data)) {
      if (typeof data === 'object' && data !== null) {
        const dataObj = data as Record<string, number>
        prices.push({
          exchange: 'CoinGecko',
          symbol: tokenId.toUpperCase(),
          price: dataObj['usd'] || 0,
          liquidity: dataObj['usd_market_cap'],
          volume24h: dataObj['usd_24h_vol'],
          timestamp: Date.now(),
        })
      }
    }
    return prices
  } catch (error) {
    console.error('Error fetching CoinGecko prices:', error)
    return []
  }
}

// Binance DEX prices (using Binance API)
export async function getBinancePrices(pairs: string[]): Promise<ExchangePrice[]> {
  try {
    const prices: ExchangePrice[] = []

    for (const pair of pairs) {
      try {
        const response = await axios.get('https://api.binance.com/api/v3/ticker/price', {
          params: { symbol: pair.toUpperCase() },
          timeout: 5000,
        })

        if (response.data && response.data.price) {
          const price = parseFloat(response.data.price)
          if (price > 0) {
            prices.push({
              exchange: 'Binance',
              symbol: pair.toUpperCase(),
              price,
              timestamp: Date.now(),
            })
          }
        }
      } catch (e) {
        console.warn(`[v0] Binance API error for ${pair}:`, (e as any).message)
      }
    }

    return prices
  } catch (error) {
    console.error('[v0] Error fetching Binance prices:', error)
    return []
  }
}

// Uniswap V3 prices (via Uniswap API)
export async function getUniswapPrices(tokenAddresses: string[]): Promise<ExchangePrice[]> {
  try {
    const prices: ExchangePrice[] = []

    // Note: In a real implementation, you would use the Uniswap GraphQL API
    // or the Uniswap Universal Router for accurate pricing
    for (const address of tokenAddresses) {
      // Placeholder: fetch from CoinGecko as fallback
      prices.push({
        exchange: 'Uniswap V3',
        symbol: address.slice(0, 6).toUpperCase(),
        price: 0, // Would be calculated from smart contract
        timestamp: Date.now(),
      })
    }

    return prices
  } catch (error) {
    console.error('Error fetching Uniswap prices:', error)
    return []
  }
}

// Kraken prices (uses public API)
export async function getKrakenPrices(pairs: string[]): Promise<ExchangePrice[]> {
  try {
    const prices: ExchangePrice[] = []

    for (const pair of pairs) {
      try {
        // Kraken API expects the pair in their format: XBTUSD, ETHUSD, etc.
        const response = await axios.get('https://api.kraken.com/0/public/Ticker', {
          params: { pair: pair.toUpperCase() },
          timeout: 5000,
        })

        if (response.data && response.data.result) {
          // Get the first and only result
          const firstKey = Object.keys(response.data.result)[0]
          if (firstKey) {
            const pairData = response.data.result[firstKey] as Record<string, any>
            // c = close price array, [0] = last trade close price
            const closePrice = pairData.c?.[0] ? parseFloat(pairData.c[0]) : null
            
            if (closePrice && closePrice > 0) {
              prices.push({
                exchange: 'Kraken',
                symbol: pair.toUpperCase(),
                price: closePrice,
                timestamp: Date.now(),
              })
            }
          }
        }
      } catch (e) {
        console.warn(`[v0] Kraken API error for ${pair}:`, (e as any).message)
      }
    }

    return prices
  } catch (error) {
    console.error('[v0] Error fetching Kraken prices:', error)
    return []
  }
}

// Aggregate prices from multiple exchanges
export async function getArbitragePrices(tokenSymbol: string): Promise<ExchangePrice[]> {
  const [coingecko, binance, kraken] = await Promise.all([
    getCoinGeckoPrices([tokenSymbol.toLowerCase()]),
    getBinancePrices([`${tokenSymbol}USDT`, `${tokenSymbol}BUSD`]),
    getKrakenPrices([`${tokenSymbol}USD`, `${tokenSymbol}USDT`]),
  ])

  return [...coingecko, ...binance, ...kraken].sort((a, b) => a.price - b.price)
}

// Calculate arbitrage opportunity
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
