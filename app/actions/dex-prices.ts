'use server'

import { findDexArbitrage, getDexPriceSnapshot, type DexArbitrageResult, type DexPriceSnapshot } from '@/lib/trading/dex-adapter'
import { DEX_PAIRS, MAINNET_TOKENS } from '@/lib/trading/dex-tokens'

export type DexScanResult = {
  opportunities: DexArbitrageResult[]
  snapshots: DexPriceSnapshot[]
}

export async function scanDexOpportunities(quoteAmountHuman: number = 1000): Promise<DexScanResult> {
  const [opportunityResults, snapshots] = await Promise.all([
    Promise.all(
      DEX_PAIRS.map(({ base, quote }) => {
        const decimals = MAINNET_TOKENS[quote].decimals
        const quoteAmountIn = BigInt(Math.round(quoteAmountHuman * 10 ** decimals))
        return findDexArbitrage(base, quote, quoteAmountIn)
      }),
    ),
    Promise.all(DEX_PAIRS.map(({ base, quote }) => getDexPriceSnapshot(base, quote))),
  ])

  return {
    opportunities: opportunityResults.filter((r): r is DexArbitrageResult => r !== null),
    snapshots,
  }
}
