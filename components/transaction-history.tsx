'use client'

import { CheckCircle, Clock, AlertCircle, TrendingUp } from 'lucide-react'

interface Transaction {
  id: string
  transactionType: string
  tokenSymbol: string
  amount: string
  buyPrice?: string
  sellPrice?: string
  profit?: string
  status: string
  fromExchange?: string
  toExchange?: string
  transactionHash?: string
  createdAt: string | Date
}

interface TransactionHistoryProps {
  transactions: Transaction[]
}

export default function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-blue-600" />
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {transactions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Token</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Profit</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => {
                const profit = parseFloat(tx.profit || '0')
                const isProfitable = profit > 0

                return (
                  <tr key={tx.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tx.transactionType === 'arbitrage' ? (
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-muted"></div>
                        )}
                        <span className="font-medium text-foreground capitalize">
                          {tx.transactionType}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground font-semibold">{tx.tokenSymbol}</td>
                    <td className="px-4 py-3 text-muted-foreground">{parseFloat(tx.amount).toFixed(4)}</td>
                    <td className="px-4 py-3">
                      <div className={`font-semibold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                        {isProfitable ? '+' : '-'}${Math.abs(profit).toFixed(2)}
                      </div>
                      {tx.transactionType === 'arbitrage' && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tx.fromExchange} → {tx.toExchange}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(tx.status)}
                        <span className="text-xs capitalize">{getStatusLabel(tx.status)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(tx.createdAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No transactions yet. Start by connecting a wallet and executing a trade!</p>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="border-t border-border bg-muted/50 px-4 py-3">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="text-lg font-semibold text-foreground">{transactions.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-lg font-semibold text-green-600">
                {transactions.filter((t) => t.status === 'completed').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Profit</p>
              <p className="text-lg font-semibold text-foreground">
                $
                {transactions
                  .reduce((sum, t) => sum + parseFloat(t.profit || '0'), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
