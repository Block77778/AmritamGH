export type DexToken = {
  symbol: string
  address: `0x${string}`
  decimals: number
}

// Ethereum mainnet only for v1. Verified against Etherscan at write-time.
export const MAINNET_TOKENS: Record<string, DexToken> = {
  WETH: { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  USDC: { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  USDT: { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  WBTC: { symbol: 'WBTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
}

export const DEX_PAIRS: Array<{ base: keyof typeof MAINNET_TOKENS; quote: keyof typeof MAINNET_TOKENS }> = [
  { base: 'WETH', quote: 'USDC' },
  { base: 'WETH', quote: 'USDT' },
  { base: 'WBTC', quote: 'USDC' },
]

// Verified live mainnet deployments:
// https://etherscan.io/address/0x61ffe014ba17989e743c5f6cb21bf9697530b21e (QuoterV2)
// https://etherscan.io/address/0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45 (SwapRouter02)
// https://etherscan.io/address/0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f (SushiSwap Router)
export const UNISWAP_V3_QUOTER_V2 = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e' as const
export const UNISWAP_V3_SWAP_ROUTER_02 = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as const
export const SUSHISWAP_V2_ROUTER = '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F' as const
export const UNISWAP_V3_FEE_TIER = 3000 // 0.3% pool — most liquid tier for these pairs
export const MAINNET_CHAIN_ID = 1
