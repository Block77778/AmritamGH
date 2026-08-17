'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { addConnectedWallet } from '@/app/actions/wallet'
import {
  isValidEvmAddress,
  isValidSolanaAddress,
  isValidBitcoinAddress,
  isValidTronAddress,
  EVM_CHAINS,
} from '@/lib/wallet-utils'
import { Wallet, Loader } from 'lucide-react'

interface WalletConnectorProps {
  onWalletAdded: () => void
}

// EIP-6963: the standard EVM wallets use to announce themselves to a page.
// This auto-discovers whatever's actually installed instead of us hardcoding
// per-brand detection — works for MetaMask, OKX Wallet, Coinbase Wallet,
// Trust Wallet, Rabby, and any other EIP-6963-compliant extension.
type EIP6963ProviderInfo = { uuid: string; name: string; icon: string; rdns: string }
type EIP6963ProviderDetail = { info: EIP6963ProviderInfo; provider: any }

function useEip6963Providers() {
  const [providers, setProviders] = useState<EIP6963ProviderDetail[]>([])

  useEffect(() => {
    const handleAnnounce = (event: any) => {
      setProviders((prev) => {
        if (prev.some((p) => p.info.uuid === event.detail.info.uuid)) return prev
        return [...prev, event.detail]
      })
    }
    window.addEventListener('eip6963:announceProvider', handleAnnounce)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    return () => window.removeEventListener('eip6963:announceProvider', handleAnnounce)
  }, [])

  return providers
}

export default function WalletConnector({ onWalletAdded }: WalletConnectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedChain, setSelectedChain] = useState<string>('EVM')
  const [selectedChainId, setSelectedChainId] = useState<number>(1)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletProvider, setWalletProvider] = useState('')
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [manualEntry, setManualEntry] = useState(false)

  const evmProviders = useEip6963Providers()

  const chains = ['EVM', 'Solana', 'Bitcoin', 'Tron']

  const connectEvmProvider = async (detail: EIP6963ProviderDetail) => {
    setError('')
    try {
      setConnecting(true)
      const accounts: string[] = await detail.provider.request({ method: 'eth_requestAccounts' })
      if (accounts?.[0]) {
        setWalletAddress(accounts[0])
        setWalletProvider(detail.info.name)
      }
    } catch (err) {
      setError(`${detail.info.name} connection failed: ${(err as any)?.message ?? 'Unknown error'}`)
    } finally {
      setConnecting(false)
    }
  }

  const connectPhantom = async () => {
    setError('')
    if (typeof window === 'undefined' || !window.solana?.isPhantom) {
      setError('Phantom not detected. Install the extension, or use manual entry below.')
      return
    }
    try {
      setConnecting(true)
      const resp = await window.solana.connect()
      setWalletAddress(resp.publicKey.toString())
      setWalletProvider('Phantom')
    } catch (err) {
      setError(`Phantom connection failed: ${(err as any)?.message ?? 'Unknown error'}`)
    } finally {
      setConnecting(false)
    }
  }

  const connectSolflare = async () => {
    setError('')
    if (typeof window === 'undefined' || !window.solflare?.isSolflare) {
      setError('Solflare not detected. Install the extension, or use manual entry below.')
      return
    }
    try {
      setConnecting(true)
      await window.solflare.connect()
      const address = window.solflare.publicKey?.toString()
      if (address) {
        setWalletAddress(address)
        setWalletProvider('Solflare')
      }
    } catch (err) {
      setError(`Solflare connection failed: ${(err as any)?.message ?? 'Unknown error'}`)
    } finally {
      setConnecting(false)
    }
  }

  const connectUnisat = async () => {
    setError('')
    if (typeof window === 'undefined' || !window.unisat) {
      setError('Unisat not detected. Install the extension, or use manual entry below.')
      return
    }
    try {
      setConnecting(true)
      const accounts: string[] = await window.unisat.requestAccounts()
      if (accounts?.[0]) {
        setWalletAddress(accounts[0])
        setWalletProvider('Unisat')
      }
    } catch (err) {
      setError(`Unisat connection failed: ${(err as any)?.message ?? 'Unknown error'}`)
    } finally {
      setConnecting(false)
    }
  }

  const connectOkxBitcoin = async () => {
    setError('')
    if (typeof window === 'undefined' || !window.okxwallet?.bitcoin) {
      setError('OKX Wallet (Bitcoin) not detected. Install the extension, or use manual entry below.')
      return
    }
    try {
      setConnecting(true)
      const result = await window.okxwallet.bitcoin.connect()
      if (result?.address) {
        setWalletAddress(result.address)
        setWalletProvider('OKX Wallet')
      }
    } catch (err) {
      setError(`OKX Wallet connection failed: ${(err as any)?.message ?? 'Unknown error'}`)
    } finally {
      setConnecting(false)
    }
  }

  const connectTronLink = async () => {
    setError('')
    if (typeof window === 'undefined' || !window.tronLink) {
      setError('TronLink not detected. Install the extension, or use manual entry below.')
      return
    }
    try {
      setConnecting(true)
      await window.tronLink.request({ method: 'tron_requestAccounts' })
      const address = window.tronWeb?.defaultAddress?.base58
      if (address) {
        setWalletAddress(address)
        setWalletProvider('TronLink')
      } else {
        setError('TronLink is installed but no account is unlocked/selected. Open the extension and try again.')
      }
    } catch (err) {
      setError(`TronLink connection failed: ${(err as any)?.message ?? 'Unknown error'}`)
    } finally {
      setConnecting(false)
    }
  }

  const validateAddress = () => {
    setError('')
    if (!walletAddress) {
      setError('Please enter or connect a wallet address')
      return false
    }
    if (selectedChain === 'EVM' && !isValidEvmAddress(walletAddress)) {
      setError('Invalid EVM address')
      return false
    }
    if (selectedChain === 'Solana' && !isValidSolanaAddress(walletAddress)) {
      setError('Invalid Solana address')
      return false
    }
    if (selectedChain === 'Bitcoin' && !isValidBitcoinAddress(walletAddress)) {
      setError('Invalid Bitcoin address')
      return false
    }
    if (selectedChain === 'Tron' && !isValidTronAddress(walletAddress)) {
      setError('Invalid Tron address')
      return false
    }
    return true
  }

  const handleConnect = async () => {
    if (!validateAddress()) return
    setLoading(true)
    try {
      await addConnectedWallet(selectedChain, walletAddress, walletProvider || 'Manual')
      setWalletAddress('')
      setWalletProvider('')
      setManualEntry(false)
      setIsOpen(false)
      onWalletAdded()
    } catch (err) {
      setError('Failed to add wallet. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-full" size="lg">
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h3 className="font-semibold text-foreground">Connect Your Wallet</h3>

      {/* Chain Selection */}
      <div>
        <label className="text-sm font-medium text-muted-foreground block mb-2">Blockchain</label>
        <div className="grid grid-cols-4 gap-2">
          {chains.map((chain) => (
            <button
              key={chain}
              onClick={() => {
                setSelectedChain(chain)
                setWalletAddress('')
                setWalletProvider('')
                setError('')
              }}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                selectedChain === chain
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {chain}
            </button>
          ))}
        </div>
      </div>

      {/* EVM Chain Selection */}
      {selectedChain === 'EVM' && (
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-2">Network</label>
          <select
            value={selectedChainId}
            onChange={(e) => setSelectedChainId(Number(e.target.value))}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          >
            {Object.entries(EVM_CHAINS).map(([_, chain]) => (
              <option key={chain.id} value={chain.id}>{chain.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Connect via real wallet extension (preferred) */}
      {!manualEntry && (
        <div className="space-y-3">
          {selectedChain === 'EVM' && (
            evmProviders.length > 0 ? (
              <div className="space-y-2">
                {evmProviders.map((detail) => (
                  <Button
                    key={detail.info.uuid}
                    onClick={() => connectEvmProvider(detail)}
                    disabled={connecting}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {connecting ? <Loader className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                    Connect {detail.info.name}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No EVM wallet extensions detected in this browser.</p>
            )
          )}

          {selectedChain === 'Solana' && (
            <div className="space-y-2">
              <Button onClick={connectPhantom} disabled={connecting} className="w-full flex items-center justify-center gap-2">
                {connecting ? <Loader className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Connect Phantom
              </Button>
              <Button onClick={connectSolflare} disabled={connecting} variant="outline" className="w-full flex items-center justify-center gap-2">
                {connecting ? <Loader className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Connect Solflare
              </Button>
            </div>
          )}

          {selectedChain === 'Bitcoin' && (
            <div className="space-y-2">
              <Button onClick={connectUnisat} disabled={connecting} className="w-full flex items-center justify-center gap-2">
                {connecting ? <Loader className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Connect Unisat
              </Button>
              <Button onClick={connectOkxBitcoin} disabled={connecting} variant="outline" className="w-full flex items-center justify-center gap-2">
                {connecting ? <Loader className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Connect OKX Wallet
              </Button>
            </div>
          )}

          {selectedChain === 'Tron' && (
            <Button onClick={connectTronLink} disabled={connecting} className="w-full flex items-center justify-center gap-2">
              {connecting ? <Loader className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              Connect TronLink
            </Button>
          )}

          {walletAddress && (
            <div className="text-xs text-muted-foreground bg-muted rounded p-2 break-all">
              Detected address ({walletProvider}): <span className="text-foreground">{walletAddress}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => { setManualEntry(true); setError('') }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            No extension installed? Enter an address manually instead
          </button>
        </div>
      )}

      {/* Manual fallback entry */}
      {manualEntry && (
        <>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => { setWalletAddress(e.target.value); setError('') }}
              placeholder={
                selectedChain === 'EVM' ? '0x...' :
                selectedChain === 'Solana' ? 'Solana address' :
                selectedChain === 'Tron' ? 'T... (Tron address)' : 'Bitcoin address'
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ⚠️ This only tracks an address for display — it doesn't prove ownership. Use the extension connect above when possible.
            </p>
          </div>

          <button
            type="button"
            onClick={() => { setManualEntry(false); setWalletAddress(''); setError('') }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            ← Back to extension connect
          </button>
        </>
      )}

      {error && <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{error}</div>}

      <div className="flex gap-2 pt-2">
        <Button onClick={handleConnect} disabled={loading || !walletAddress} className="flex-1">
          {loading ? 'Saving...' : 'Save Wallet'}
        </Button>
        <Button
          onClick={() => { setIsOpen(false); setManualEntry(false); setWalletAddress(''); setError('') }}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

declare global {
  interface Window {
    ethereum?: any
    solana?: any
    solflare?: any
    unisat?: any
    okxwallet?: any
    tronLink?: any
    tronWeb?: any
  }
}
