import { fetchQuote, type MarketQuote } from './exchange-adapter'

export type ArbitrageOpportunity = {
  symbol: string
  buy: MarketQuote
  sell: MarketQuote
  amount: number
  grossProfit: number
  estimatedFees: number
  estimatedSlippage: number
  netProfit: number
  netProfitBps: number
  observedAt: number
  expiresAt: number
}

export async function findCrossExchangeOpportunities({
  symbol,
  exchangeIds,
  amount,
  maxAgeMs = 3_000,
}: {
  symbol: string
  exchangeIds: string[]
  amount: number
  maxAgeMs?: number
}) {
  if (exchangeIds.length < 2) throw new Error('At least two exchanges are required')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be positive')

  const quotes = (await Promise.allSettled(exchangeIds.map((id) => fetchQuote(id, symbol))))
    .flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  const now = Date.now()
  const opportunities: ArbitrageOpportunity[] = []

  for (const buy of quotes) {
    for (const sell of quotes) {
      if (buy.exchangeId === sell.exchangeId || sell.bid <= buy.ask) continue
      if (now - buy.timestamp > maxAgeMs || now - sell.timestamp > maxAgeMs) continue
      const executableAmount = Math.min(amount, buy.askVolume ?? amount, sell.bidVolume ?? amount)
      if (executableAmount <= 0) continue
      const grossProfit = (sell.bid - buy.ask) * executableAmount
      const estimatedFees = grossProfit * ((buy.takerFee ?? 0.001) + (sell.takerFee ?? 0.001))
      const estimatedSlippage = grossProfit * 0.001
      const netProfit = grossProfit - estimatedFees - estimatedSlippage
      opportunities.push({
        symbol,
        buy,
        sell,
        amount: executableAmount,
        grossProfit,
        estimatedFees,
        estimatedSlippage,
        netProfit,
        netProfitBps: Math.round((netProfit / (buy.ask * executableAmount)) * 10_000),
        observedAt: now,
        expiresAt: now + maxAgeMs,
      })
    }
  }
  return opportunities.sort((a, b) => b.netProfit - a.netProfit)
}
