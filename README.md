# CryptoArb - Multi-Chain Crypto Arbitrage Platform

A sophisticated web application for identifying and executing profitable cryptocurrency arbitrage trades across multiple blockchains and exchanges.

## 🚀 Features

### Multi-Chain Wallet Support
- **EVM Chains**: Ethereum, Polygon, Binance Smart Chain, Arbitrum, Optimism
- **Solana**: Full support with Phantom, Solflare, and Magic wallets
- **Bitcoin**: P2PKH, P2SH, Bech32 address formats supported

### Exchange Integration
- **DEX**: Uniswap V3, SushiSwap
- **CEX**: Binance, Kraken, Coinbase, OKX

### Real-Time Features
- Live price monitoring across multiple exchanges
- Automatic arbitrage opportunity detection
- Price spread calculation (percentage difference between exchanges)
- Gas fee estimation for trades

### Trade Execution
- One-click arbitrage execution
- Built-in slippage protection
- Transaction tracking with status monitoring
- Profit/loss calculation
- Full transaction history

### User Management
- Secure email + password authentication with Better Auth
- Connected wallet management
- Transaction history with detailed breakdowns
- Portfolio analytics

## 🏗️ Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **Wallet Integration**: 
  - EVM: wagmi, viem
  - Solana: @solana/web3.js
  - Bitcoin: Native validation
- **Price Feeds**: 
  - CoinGecko API (free tier)
  - Binance API
  - Kraken API
- **UI Components**: shadcn/ui with Base UI

## 📦 Installation

### Prerequisites
- Node.js 18+ with pnpm
- Neon PostgreSQL database
- Better Auth secret (generate: `openssl rand -base64 32`)

### Setup

1. **Clone and install dependencies**
   ```bash
   pnpm install
   ```

2. **Set environment variables** (`.env.local`)
   ```
   DATABASE_URL=postgresql://[user]:[password]@[host]/[database]
   BETTER_AUTH_SECRET=<generated-secret>
   ```

3. **Set up database schema**
   - Better Auth tables are created automatically
   - App tables: `connected_wallets`, `transactions`, `price_snapshots`

4. **Run dev server**
   ```bash
   pnpm dev
   ```

   Visit `http://localhost:3000`

## 📱 App Structure

```
app/
├── page.tsx                    # Landing page
├── sign-in/page.tsx           # Sign in page
├── sign-up/page.tsx           # Sign up page
├── dashboard/page.tsx         # Main dashboard
├── api/auth/[...all]/route.ts # Better Auth handler
└── actions/
    └── wallet.ts              # Server actions for wallet/trading

components/
├── dashboard-client.tsx       # Main dashboard component
├── wallet-connector.tsx       # Wallet connection UI
├── price-monitor.tsx          # Price tracking & comparison
├── arbitrage-opportunities.tsx # Trade execution UI
├── transaction-history.tsx    # Trade history display
└── auth-form.tsx             # Sign in/up form

lib/
├── auth.ts                    # Better Auth config
├── auth-client.ts             # Client-side auth
├── db/
│   ├── index.ts              # Drizzle setup
│   └── schema.ts             # Database schema
├── exchanges.ts               # Exchange API utilities
└── wallet-utils.ts           # Wallet validation & helpers
```

## 🔄 Data Flow

### Wallet Connection
1. User selects blockchain (EVM/Solana/Bitcoin)
2. Enters wallet address
3. Server validates and stores in `connected_wallets` table
4. Wallet appears in dashboard

### Price Monitoring
1. Frontend requests prices from multiple exchanges
2. `getArbitragePrices()` aggregates data
3. Calculates spread and opportunity metrics
4. Updates UI every 30 seconds

### Trade Execution
1. User selects a profitable opportunity
2. Enters trade amount and selects wallet
3. System estimates gas fees
4. Creates transaction record with "pending" status
5. Transaction data stored in `transactions` table
6. User executes trade through wallet
7. On completion, transaction hash is recorded

## 🔐 Security

- **Private Keys**: Never stored; stay in user's wallet
- **API Credentials**: Encrypted storage (ready for CEX integration)
- **Database**: Per-user scoping via `userId` in all queries
- **Session Management**: Better Auth handles secure cookies
- **Input Validation**: Comprehensive address format validation

## 📊 Database Schema

### Users (Better Auth)
- id, email, emailVerified, name, image, timestamps

### Sessions (Better Auth)
- id, userId, token, expiresAt, ipAddress, userAgent

### Connected Wallets
- id, userId, chainType, walletAddress, walletProvider, isActive

### Transactions
- id, userId, walletId, transactionType, fromExchange, toExchange
- tokenSymbol, amount, buyPrice, sellPrice, profit, gasFeesEstimate
- transactionHash, status, timestamps

### Price Snapshots
- id, userId, tokenSymbol, exchange, price, liquidity, volume24h, timestamp

## 🎯 Usage Examples

### Connect a Wallet
1. Click "Connect Wallet" button
2. Select blockchain (EVM/Solana/Bitcoin)
3. For EVM: select network (Ethereum/Polygon/BSC/etc)
4. Select wallet provider
5. Enter wallet address
6. Click "Connect"

### Find Arbitrage Opportunity
1. Go to Dashboard → Prices tab
2. Select token (BTC, ETH, SOL, USDC, USDT)
3. View prices across exchanges
4. Check current spread percentage
5. Go to Overview tab to execute

### Execute Trade
1. Select connected wallet
2. Enter amount to trade
3. System shows:
   - Buy exchange (lowest price)
   - Sell exchange (highest price)
   - Estimated profit
   - Gas fees
4. Click "Execute Arbitrage Trade"
5. Confirm in wallet extension
6. Monitor transaction in history

## 🔌 API Integrations

### CoinGecko (Free)
- Real-time crypto prices
- Market cap and volume data
- No API key required

### Binance
- Spot trading prices
- High liquidity
- No auth required for public data

### Kraken
- CEX pricing
- Volume and liquidity data
- No auth required for public data

### Solana
- Real-time balance checks
- Network connectivity verification

## ⚙️ Configuration

### Adding New Chains
Edit `lib/wallet-utils.ts`:
```typescript
export const EVM_CHAINS = {
  // Add new chain here
  mychain: { id: 999, name: 'My Chain', rpc: 'https://...' }
}
```

### Adding New Exchanges
Edit `lib/exchanges.ts`:
```typescript
export async function getMyExchangePrices(pairs: string[]) {
  // Implement price fetching
  return prices
}
```

### Supported Tokens
Modify `components/price-monitor.tsx`:
```typescript
const POPULAR_TOKENS = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'NEW_TOKEN']
```

## 📈 Performance

- Real-time price updates every 30 seconds
- Optimistic UI updates during trade execution
- Efficient database queries with userId indexing
- Responsive design for mobile and desktop
- Fast loading with Next.js 16 Turbopack

## 🚀 Deployment

### To Vercel
```bash
vercel deploy
```

### Environment Variables (Production)
```
DATABASE_URL=<production-neon-url>
BETTER_AUTH_SECRET=<production-secret>
BETTER_AUTH_URL=https://yourdomain.com (if custom domain)
```

## 📝 Notes

- **Gas Fees**: Estimated at 0.1% of transaction value. Adjust in `estimateGasFees()` if needed.
- **Profitability**: Minimum ~1% spread recommended for meaningful arbitrage opportunities
- **Price Feeds**: Use CoinGecko for reliable free data; consider paid APIs for production
- **Testnet**: Deploy to testnet first to validate trade execution without real funds

## 🤝 Contributing

The app is designed to be modular. To extend:
1. Add new exchange APIs to `lib/exchanges.ts`
2. Add new wallet chains to `lib/wallet-utils.ts`
3. Add server actions to `app/actions/wallet.ts`
4. Create new components in `components/`

## ⚠️ Disclaimer

This is an educational platform. Users are responsible for:
- Validating all price data before trading
- Understanding arbitrage risks (slippage, MEV, gas costs)
- Ensuring they have proper permissions to execute trades
- Complying with local regulations regarding crypto trading

Always test with small amounts first!

## 📞 Support

For issues or questions:
1. Check console logs for errors
2. Verify database connectivity
3. Ensure all environment variables are set
4. Check exchange API status pages

---

**Version**: 1.0.0  
**Last Updated**: July 2026
