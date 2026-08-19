import { createPublicClient, http, type Address } from 'viem'
import { mainnet } from 'viem/chains'
import { UNISWAP_V3_QUOTER_V2, UNISWAP_V3_FEE_TIER, SUSHISWAP_V2_ROUTER, MAINNET_TOKENS } from './dex-tokens'

const RPC_URL = process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://eth.llamarpc.com'

const publicClient = createPublicClient({ chain: mainnet, transport: http(RPC_URL) })

export const quoterV2Abi = [
  {
    name: 'quoteExactInputSingle', type: 'function', stateMutability: 'nonpayable',
    inputs: [{
      name: 'params', type: 'tuple',
      components: [
        { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' },
        { name: 'amountIn', type: 'uint256' }, { name: 'fee', type: 'uint24' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
    }],
    outputs: [
      { name: 'amountOut', type: 'uint256' }, { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' }, { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const

export const sushiRouterAbi = [
  {
    name: 'getAmountsOut', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'path', type: 'address[]' }],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
  {
    name: 'swapExactTokensForTokens', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' },
      { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const

export const swapRouter02Abi = [
  {
    name: 'exactInputSingle', type: 'function', stateMutability: 'payable',
    inputs: [{
      name: 'params', type: 'tuple',
      components: [
        { name: 'tokenIn', type: 'address' }, { name: 'tokenOut', type: 'address' },
        { name: 'fee', type: 'uint24' }, { name: 'recipient', type: 'address' },
        { name: 'amountIn', type: 'uint256' }, { name: 'amountOutMinimum', type: 'uint256' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
    }],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const

export const erc20Abi = [
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const

export type DexId = 'Uniswap V3' | 'SushiSwap V2'
export type DexQuote = { dex: DexId; amountOut: bigint; timestamp: number }

export async function getUniswapV3Quote(tokenIn: Address, tokenOut: Address, amountIn: bigint): Promise<DexQuote | null> {
  try {
    const result = await publicClient.readContract({
      address: UNISWAP_V3_QUOTER_V2, abi: quoterV2Abi, functionName: 'quoteExactInputSingle',
      args: [{ tokenIn, tokenOut, amountIn, fee: UNISWAP_V3_FEE_TIER, sqrtPriceLimitX96: 0n }],
    })
    return { dex: 'Uniswap V3', amountOut: result[0], timestamp: Date.now() }
  } catch (error) {
    console.error('[dex] Uniswap quote failed:', error)
    return null
  }
}

export async function getSushiswapQuote(tokenIn: Address, tokenOut: Address, amountIn: bigint): Promise<DexQuote | null> {
  try {
    const amounts = await publicClient.readContract({
      address: SUSHISWAP_V2_ROUTER, abi: sushiRouterAbi, functionName: 'getAmountsOut',
      args: [amountIn, [tokenIn, tokenOut]],
    })
    return { dex: 'SushiSwap V2', amountOut: amounts[amounts.length - 1], timestamp: Date.now() }
  } catch (error) {
    console.error('[dex] SushiSwap quote failed:', error)
    return null
  }
}

export type DexArbitrageResult = {
  baseSymbol: string
  quoteSymbol: string
  quoteAmountIn: bigint
  baseAcquired: bigint
  buyDex: DexId
  sellDex: DexId
  quoteReceived: bigint
  profitQuoteUnits: bigint
  profitPercentage: number
  timestamp: number
}

export async function findDexArbitrage(
  base: keyof typeof MAINNET_TOKENS,
  quote: keyof typeof MAINNET_TOKENS,
  quoteAmountIn: bigint,
): Promise<DexArbitrageResult | null> {
  const quoteToken = MAINNET_TOKENS[quote].address
  const baseToken = MAINNET_TOKENS[base].address

  const [uniBuy, sushiBuy] = await Promise.all([
    getUniswapV3Quote(quoteToken, baseToken, quoteAmountIn),
    getSushiswapQuote(quoteToken, baseToken, quoteAmountIn),
  ])
  if (!uniBuy || !sushiBuy) return null

  const buyDex: DexId = uniBuy.amountOut > sushiBuy.amountOut ? 'Uniswap V3' : 'SushiSwap V2'
  const baseAcquired = buyDex === 'Uniswap V3' ? uniBuy.amountOut : sushiBuy.amountOut
  if (baseAcquired <= 0n) return null

  const [uniSell, sushiSell] = await Promise.all([
    getUniswapV3Quote(baseToken, quoteToken, baseAcquired),
    getSushiswapQuote(baseToken, quoteToken, baseAcquired),
  ])
  if (!uniSell || !sushiSell) return null

  const sellDex: DexId = uniSell.amountOut > sushiSell.amountOut ? 'Uniswap V3' : 'SushiSwap V2'
  if (sellDex === buyDex) return null

  const quoteReceived = sellDex === 'Uniswap V3' ? uniSell.amountOut : sushiSell.amountOut
  const profitQuoteUnits = quoteReceived - quoteAmountIn
  const profitPercentage = (Number(profitQuoteUnits) / Number(quoteAmountIn)) * 100

  return {
    baseSymbol: base, quoteSymbol: quote, quoteAmountIn, baseAcquired,
    buyDex, sellDex, quoteReceived, profitQuoteUnits, profitPercentage,
    timestamp: Date.now(),
  }
}

export type DexPriceSnapshot = {
  base: string
  quote: string
  uniswapPrice: number | null
  sushiswapPrice: number | null
}

// Direct spot-price read from each DEX for 1 unit of `base`, shown regardless
// of whether an arbitrage opportunity exists — lets you see live quotes are
// actually working instead of guessing from an empty opportunities list.
export async function getDexPriceSnapshot(
  base: keyof typeof MAINNET_TOKENS,
  quote: keyof typeof MAINNET_TOKENS,
): Promise<DexPriceSnapshot> {
  const baseToken = MAINNET_TOKENS[base]
  const quoteToken = MAINNET_TOKENS[quote]
  const oneBase = 10n ** BigInt(baseToken.decimals)

  const [uni, sushi] = await Promise.all([
    getUniswapV3Quote(baseToken.address, quoteToken.address, oneBase),
    getSushiswapQuote(baseToken.address, quoteToken.address, oneBase),
  ])

  return {
    base,
    quote,
    uniswapPrice: uni ? Number(uni.amountOut) / 10 ** quoteToken.decimals : null,
    sushiswapPrice: sushi ? Number(sushi.amountOut) / 10 ** quoteToken.decimals : null,
  }
}
