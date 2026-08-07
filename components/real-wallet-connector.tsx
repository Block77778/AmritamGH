'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, X, Copy, Check, Loader } from 'lucide-react'

interface RealWalletConnectorProps {
  onConnect?: (address: string, walletType: string, chainId?: number) => void
}

export function RealWalletConnector({ onConnect }: RealWalletConnectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const WALLET_OPTIONS = [
    { name: 'MetaMask', type: 'EVM', icon: '🦊', description: 'Ethereum & EVM chains' },
    { name: 'Phantom', type: 'Solana', icon: '👻', description: 'Solana blockchain' },
    { name: 'Unisat', type: 'Bitcoin', icon: '₿', description: 'Bitcoin network' },
  ]

  // Connect to MetaMask or other EVM wallets
  const connectMetaMask = async () => {
    try {
      setConnecting(true)
      setError(null)

      if (!window.ethereum) {
        setError('MetaMask not installed. Please install MetaMask extension.')
        setConnecting(false)
        return
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        setWalletAddress(address)
        setSelectedWallet('MetaMask')
        setConnected(true)
        setIsOpen(false)
        onConnect?.(address, 'EVM', 1) // chainId 1 = mainnet
        console.log('[v0] MetaMask connected:', address)
      }
    } catch (err) {
      setError(`MetaMask connection failed: ${(err as any).message}`)
      console.error('[v0] MetaMask error:', err)
    } finally {
      setConnecting(false)
    }
  }

  // Connect to Phantom (Solana)
  const connectPhantom = async () => {
    try {
      setConnecting(true)
      setError(null)

      if (!window.solana?.isPhantom) {
        setError('Phantom not installed. Please install Phantom wallet extension.')
        setConnecting(false)
        return
      }

      const resp = await window.solana.connect()
      const address = resp.publicKey.toString()
      
      setWalletAddress(address)
      setSelectedWallet('Phantom')
      setConnected(true)
      setIsOpen(false)
      onConnect?.(address, 'Solana')
      console.log('[v0] Phantom connected:', address)
    } catch (err) {
      setError(`Phantom connection failed: ${(err as any).message}`)
      console.error('[v0] Phantom error:', err)
    } finally {
      setConnecting(false)
    }
  }

  // Connect to Unisat (Bitcoin)
  const connectUnisat = async () => {
    try {
      setConnecting(true)
      setError(null)

      if (!window.unisat) {
        setError('Unisat not installed. Please install Unisat wallet extension.')
        setConnecting(false)
        return
      }

      const accounts = await window.unisat.requestAccounts()
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0]
        setWalletAddress(address)
        setSelectedWallet('Unisat')
        setConnected(true)
        setIsOpen(false)
        onConnect?.(address, 'Bitcoin')
        console.log('[v0] Unisat connected:', address)
      }
    } catch (err) {
      setError(`Unisat connection failed: ${(err as any).message}`)
      console.error('[v0] Unisat error:', err)
    } finally {
      setConnecting(false)
    }
  }

  const handleConnect = async (walletName: string) => {
    if (walletName === 'MetaMask') {
      await connectMetaMask()
    } else if (walletName === 'Phantom') {
      await connectPhantom()
    } else if (walletName === 'Unisat') {
      await connectUnisat()
    }
  }

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDisconnect = () => {
    setConnected(false)
    setSelectedWallet(null)
    setWalletAddress(null)
    setError(null)
  }

  if (connected && walletAddress) {
    return (
      <div className="relative group">
        <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-xs tracking-wider font-semibold shadow-lg shadow-primary/30">
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">{selectedWallet}</span>
          <span className="sm:hidden">Wallet</span>
        </Button>

        {/* Dropdown Menu */}
        <div className="absolute right-0 mt-2 w-64 bg-background border border-[#2a2a2a] rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-4 border-b border-[#2a2a2a]">
            <div className="text-sm font-semibold text-foreground mb-2">{selectedWallet}</div>
            <div className="flex items-center justify-between bg-[#1a1a1a] rounded p-2">
              <span className="text-xs text-muted-foreground truncate">{walletAddress.slice(0, 12)}...{walletAddress.slice(-10)}</span>
              <button
                onClick={handleCopyAddress}
                className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-xs tracking-wider font-semibold shadow-lg shadow-primary/30"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </Button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-background border border-[#2a2a2a] rounded-xl max-w-md w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
              <h2 className="text-lg font-bold text-foreground">Connect Wallet</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Wallet Options */}
            <div className="p-6 space-y-3">
              {WALLET_OPTIONS.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet.name)}
                  disabled={connecting}
                  className="w-full p-4 bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] hover:border-primary/50 rounded-lg transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{wallet.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-foreground">{wallet.name}</div>
                      <div className="text-xs text-muted-foreground">{wallet.description}</div>
                    </div>
                    {connecting && <Loader className="w-4 h-4 animate-spin text-primary" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Security Notice */}
            <div className="m-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-xs text-muted-foreground">
                🔒 Never share your private keys. Wallets are always connected directly from your device.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Type declarations for window objects
declare global {
  interface Window {
    ethereum?: any
    solana?: any
    unisat?: any
  }
}
