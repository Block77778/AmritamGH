'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet, X, Copy, Check } from 'lucide-react'

interface SimpleWalletButtonProps {
  onConnect?: (address: string, walletType: string) => void
}

const WALLET_OPTIONS = [
  { name: 'MetaMask', type: 'EVM', icon: '🦊', description: 'Ethereum & EVM chains' },
  { name: 'Phantom', type: 'Solana', icon: '👻', description: 'Solana blockchain' },
  { name: 'Unisat', type: 'Bitcoin', icon: '₿', description: 'Bitcoin network' },
  { name: 'WalletConnect', type: 'EVM', icon: '🔗', description: 'Universal Web3 wallet' },
]

export function SimpleWalletButton({ onConnect }: SimpleWalletButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [connected, setConnected] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleConnect = (walletName: string, walletType: string) => {
    // Generate a mock wallet address
    const mockAddress = `${walletType === 'EVM' ? '0x' : ''}${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    
    setSelectedWallet(walletName)
    setWalletAddress(mockAddress)
    setConnected(true)
    setIsOpen(false)
    
    onConnect?.(mockAddress, walletType)
    console.log(`[v0] Connected ${walletName} wallet: ${mockAddress}`)
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
  }

  if (connected && walletAddress) {
    return (
      <div className="relative group">
        <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
          <Wallet className="w-4 h-4" />
          <span className="hidden sm:inline">{selectedWallet}</span>
          <span className="sm:hidden">Wallet Connected</span>
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
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </Button>

      {/* Wallet Selection Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-background border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            <h2 className="text-2xl font-bold text-foreground mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Select a wallet provider to start arbitrage trading
            </p>

            <div className="space-y-2">
              {WALLET_OPTIONS.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet.name, wallet.type)}
                  className="w-full flex items-center gap-4 p-4 bg-gradient-to-br from-[#1a1a1a] to-background border border-[#2a2a2a] hover:border-primary/50 rounded-lg transition-all hover:shadow-lg hover:shadow-primary/20"
                >
                  <span className="text-3xl">{wallet.icon}</span>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-foreground">{wallet.name}</div>
                    <div className="text-xs text-muted-foreground">{wallet.description}</div>
                  </div>
                  <span className="text-primary">→</span>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-400">
                <span className="font-semibold">💡 Note:</span> Your wallet will be used to execute arbitrage trades across exchanges. Keep your private keys secure.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
