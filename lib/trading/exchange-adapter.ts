import ccxt, { type Exchange, type Order, type Ticker } from 'ccxt'

export type ExchangeId = string

export type MarketQuote = {
  exchangeId: string
  symbol: string
  bid: number
  ask: number
  bidVolume: number | null
  askVolume: number | null
  quoteVolume24h: number | null
  timestamp: number
  takerFee: number | null
}

export type ExchangeCredentials = {
  apiKey: string
  secret: string
  password?: string
}

const exchangeIds = new Set(ccxt.exchanges)

function assertExchangeId(exchangeId: string) {
  if (!exchangeIds.has(exchangeId)) {
    throw new Error(`Unsupported CCXT exchange: ${exchangeId}`)
  }
}

export function getSupportedExchangeIds() {
  return [...exchangeIds].sort()
}

export function createExchange(exchangeId: string, credentials?: ExchangeCredentials): Exchange {
  assertExchangeId(exchangeId)
  const ExchangeClass = (ccxt as unknown as Record<string, typeof Exchange>)[exchangeId]
  if (!ExchangeClass) throw new Error(`Exchange adapter is unavailable: ${exchangeId}`)

  return new ExchangeClass({
    apiKey: credentials?.apiKey,
    secret: credentials?.secret,
    password: credentials?.password,
    enableRateLimit: true,
    timeout: 15_000,
    options: { adjustForTimeDifference: true },
  })
}

export async function fetchQuote(exchangeId: string, symbol: string, credentials?: ExchangeCredentials): Promise<MarketQuote> {
  const exchange = createExchange(exchangeId, credentials)
  try {
    await exchange.loadMarkets()
    const market = exchange.markets?.[symbol]
    if (!market) throw new Error(`${symbol} is not available on ${exchangeId}`)
    const ticker: Ticker = await exchange.fetchTicker(symbol)
    if (!ticker.bid || !ticker.ask || ticker.bid <= 0 || ticker.ask <= 0) {
      throw new Error(`No executable bid/ask for ${symbol} on ${exchangeId}`)
    }
    return {
      exchangeId,
      symbol,
      bid: ticker.bid,
      ask: ticker.ask,
      bidVolume: ticker.bidVolume ?? null,
      askVolume: ticker.askVolume ?? null,
      quoteVolume24h: ticker.quoteVolume ?? null,
      timestamp: ticker.timestamp ?? Date.now(),
      takerFee: market.taker ?? null,
    }
  } finally {
    await exchange.close()
  }
}

export async function validateCredentials(exchangeId: string, credentials: ExchangeCredentials) {
  const exchange = createExchange(exchangeId, credentials)
  try {
    await exchange.fetchBalance()
    return { valid: true as const }
  } catch (error) {
    return { valid: false as const, error: error instanceof Error ? error.message : 'Credential validation failed' }
  } finally {
    await exchange.close()
  }
}

export async function placeLimitOrder(
  exchangeId: string,
  credentials: ExchangeCredentials,
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
  price: number,
  clientOrderId: string,
): Promise<Order> {
  const exchange = createExchange(exchangeId, credentials)
  try {
    exchange.options = { ...exchange.options, clientOrderId }
    return await exchange.createOrder(symbol, 'limit', side, amount, price, { clientOrderId })
  } finally {
    await exchange.close()
  }
}

export async function fetchOrder(exchangeId: string, credentials: ExchangeCredentials, orderId: string, symbol: string) {
  const exchange = createExchange(exchangeId, credentials)
  try {
    return await exchange.fetchOrder(orderId, symbol)
  } finally {
    await exchange.close()
  }
}

export async function cancelOrder(exchangeId: string, credentials: ExchangeCredentials, orderId: string, symbol: string) {
  const exchange = createExchange(exchangeId, credentials)
  try {
    return await exchange.cancelOrder(orderId, symbol)
  } finally {
    await exchange.close()
  }
}

export async function placeMarketOrder(
  exchangeId: string,
  credentials: ExchangeCredentials,
  symbol: string,
  side: 'buy' | 'sell',
  amount: number,
): Promise<Order> {
  const exchange = createExchange(exchangeId, credentials)
  try {
    return await exchange.createOrder(symbol, 'market', side, amount)
  } finally {
    await exchange.close()
  }
}
