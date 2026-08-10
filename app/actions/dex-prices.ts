'use server'

import { findDexArbitrage, type DexArbitrageResult } from '@/lib/trading/dex-adapter'
import { DEX_PAIRS, MAINNET_TOKENS } from '@/lib/trading/dex-tokens'

export async function scanDexOpportunities(quoteAmountHuman: number = 1000): Promise<DexArbitrageResult[]> {
  const results = await Promise.all(
    DEX_PAIRS.map(({ base, quote }) => {
      const decimals = MAINNET_TOKENS[quote].decimals
      const quoteAmountIn = BigInt(Math.round(quoteAmountHuman * 10 ** decimals))
      return findDexArbitrage(base, quote, quoteAmountIn)
    }),
  )
  return results.filter((r): r is DexArbitrageResult => r !== null)
}
