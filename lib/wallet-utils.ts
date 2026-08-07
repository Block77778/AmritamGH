import { PublicKey, Connection } from '@solana/web3.js'

// EVM Wallet utilities
export const EVM_CHAINS = {
  ethereum: { id: 1, name: 'Ethereum', rpc: 'https://eth.public.blastapi.io' },
  polygon: { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc.com' },
  bsc: { id: 56, name: 'Binance Smart Chain', rpc: 'https://bsc-dataseed.binance.org' },
  arbitrum: { id: 42161, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
  optimism: { id: 10, name: 'Optimism', rpc: 'https://mainnet.optimism.io' },
}

export const SOLANA_CONFIG = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

// Validate EVM wallet address
export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Validate Solana wallet address
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address)
    return true
  } catch {
    return false
  }
}

// Validate Bitcoin address (P2PKH, P2SH, P2WPKH, Bech32)
export function isValidBitcoinAddress(address: string): boolean {
  const patterns = {
    p2pkh: /^1[1-9A-HJ-NP-Z]{25,34}$/,
    p2sh: /^3[1-9A-HJ-NP-Z]{25,34}$/,
    bech32: /^bc1[a-z0-9]{39,59}$/,
  }

  return Object.values(patterns).some((pattern) => pattern.test(address))
}

// Get wallet provider info
export function getWalletInfo(provider: string, chainType: string) {
  const providers: Record<string, Record<string, { name: string; icon: string }>> = {
    EVM: {
      MetaMask: { name: 'MetaMask', icon: 'M' },
      WalletConnect: { name: 'WalletConnect', icon: 'W' },
      CoinbaseWallet: { name: 'Coinbase Wallet', icon: 'C' },
      TrustWallet: { name: 'Trust Wallet', icon: 'T' },
    },
    Solana: {
      Phantom: { name: 'Phantom', icon: 'P' },
      Solflare: { name: 'Solflare', icon: 'S' },
      Magic: { name: 'Magic', icon: 'M' },
    },
    Bitcoin: {
      Unisat: { name: 'Unisat', icon: 'U' },
      OKX: { name: 'OKX Wallet', icon: 'O' },
      Leather: { name: 'Leather', icon: 'L' },
    },
  }

  return providers[chainType]?.[provider] || { name: provider, icon: provider[0] }
}

// Format wallet address for display
export function formatWalletAddress(address: string, length: number = 6): string {
  if (address.length <= length * 2) return address
  return `${address.slice(0, length)}...${address.slice(-length)}`
}

// Check if wallet is connected
export async function isWalletConnected(walletAddress: string, chainType: string): Promise<boolean> {
  try {
    if (chainType === 'Solana') {
      const connection = new Connection(SOLANA_CONFIG.mainnet)
      const balance = await connection.getBalance(new PublicKey(walletAddress))
      return balance >= 0
    }
    // For EVM and Bitcoin, assume valid format means connected (actual connection check via wagmi/library)
    return true
  } catch {
    return false
  }
}

// Get chain display name
export function getChainName(chainType: string, chainId?: number): string {
  if (chainType === 'EVM' && chainId) {
    return Object.entries(EVM_CHAINS).find(([_, v]) => v.id === chainId)?.[1].name || 'Unknown EVM Chain'
  }
  return chainType
}

// Parse token with decimals
export function parseTokenAmount(amount: string, decimals: number): string {
  const factor = Math.pow(10, decimals)
  return (parseFloat(amount) * factor).toString()
}

// Format token amount from smallest unit
export function formatTokenAmount(amount: string, decimals: number): string {
  const factor = Math.pow(10, decimals)
  return (parseFloat(amount) / factor).toFixed(decimals)
}

// Estimate gas fees for arbitrage
export function estimateGasFees(
  chainType: string,
  gasPriceGwei: number,
  gasUnits: number = 200000 // typical swap gas
): number {
  // Simple gas estimation
  const gasPrice = gasPriceGwei / 1e9 // Convert to ETH
  const gasAmount = gasUnits * gasPrice
  return gasAmount
}

// Calculate net profit after fees
export function calculateNetProfit(
  buyAmount: number,
  buyPrice: number,
  sellPrice: number,
  gasFees: number,
  slippagePercent: number = 0.5
): { profit: number; profitPercent: number; totalCost: number } {
  const grossProfit = (buyAmount * sellPrice - buyAmount * buyPrice) / (buyAmount * buyPrice)
  const slippage = buyAmount * buyPrice * (slippagePercent / 100)
  const netProfit = grossProfit * buyAmount * buyPrice - gasFees - slippage
  const profitPercent = (netProfit / (buyAmount * buyPrice)) * 100

  return {
    profit: netProfit,
    profitPercent,
    totalCost: buyAmount * buyPrice + gasFees,
  }
}
