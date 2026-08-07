'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { addConnectedWallet } from '@/app/actions/wallet'
import {
  isValidEvmAddress,
  isValidSolanaAddress,
  isValidBitcoinAddress,
  EVM_CHAINS,
} from '@/lib/wallet-utils'
import { Wallet, ChevronDown } from 'lucide-react'

interface WalletConnectorProps {
  onWalletAdded: () => void
}

export default function WalletConnector({ onWalletAdded }: WalletConnectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedChain, setSelectedChain] = useState<string>('EVM')
  const [selectedChainId, setSelectedChainId] = useState<number>(1)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletProvider, setWalletProvider] = useState('MetaMask')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const chains = ['EVM', 'Solana', 'Bitcoin']
  const evmProviders = ['MetaMask', 'WalletConnect', 'Coinbase Wallet', 'Trust Wallet']
  const solanaProviders = ['Phantom', 'Solflare', 'Magic']
  const bitcoinProviders = ['Unisat', 'OKX', 'Leather']

  const providers = {
    EVM: evmProviders,
    Solana: solanaProviders,
    Bitcoin: bitcoinProviders,
  }

  const validateAddress = () => {
    setError('')
    if (!walletAddress) {
      setError('Please enter a wallet address')
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

    return true
  }

  const handleConnect = async () => {
    if (!validateAddress()) return

    setLoading(true)
    try {
      await addConnectedWallet(selectedChain, walletAddress, walletProvider)
      setWalletAddress('')
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
      <Button
        onClick={() => setIsOpen(true)}
        className="w-full"
        size="lg"
      >
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
        <div className="grid grid-cols-3 gap-2">
          {chains.map((chain) => (
            <button
              key={chain}
              onClick={() => {
                setSelectedChain(chain)
                setWalletProvider(providers[chain as keyof typeof providers][0])
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
          <div className="relative">
            <select
              value={selectedChainId}
              onChange={(e) => setSelectedChainId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
            >
              {Object.entries(EVM_CHAINS).map(([_, chain]) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Provider Selection */}
      <div>
        <label className="text-sm font-medium text-muted-foreground block mb-2">Wallet Provider</label>
        <div className="relative">
          <select
            value={walletProvider}
            onChange={(e) => setWalletProvider(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
          >
            {providers[selectedChain as keyof typeof providers].map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Address Input */}
      <div>
        <label className="text-sm font-medium text-muted-foreground block mb-2">Wallet Address</label>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => {
            setWalletAddress(e.target.value)
            setError('')
          }}
          placeholder={
            selectedChain === 'EVM'
              ? '0x...'
              : selectedChain === 'Solana'
                ? 'Solana address'
                : 'Bitcoin address'
          }
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Error Message */}
      {error && <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">{error}</div>}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleConnect}
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Connecting...' : 'Connect'}
        </Button>
        <Button
          onClick={() => {
            setIsOpen(false)
            setError('')
          }}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
