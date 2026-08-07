import { pgTable, text, timestamp, boolean, numeric, uniqueIndex } from 'drizzle-orm/pg-core'

// --- Better Auth required tables -------------------------------------------
// Column names are camelCase to match Better Auth's defaults. Do not rename.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

// --- App tables ------------------------------------------------------------
// Add your app tables below. Always include a plain `userId` column so queries
// can be scoped per user — the security model depends on this column existing,
// not on a foreign key. Do NOT add a foreign key constraint
// (`.references(() => user.id, ...)`) unless the user explicitly asks for
// foreign keys or referential integrity; FK constraints make iterating on the
// schema harder.
//
// Example:
//
// import { serial } from "drizzle-orm/pg-core"
//
// export const todos = pgTable("todos", {
//   id: serial("id").primaryKey(),
//   userId: text("userId").notNull(),
//   title: text("title").notNull(),
//   completed: boolean("completed").notNull().default(false),
//   createdAt: timestamp("createdAt").notNull().defaultNow(),
// })
//
// If the user asks for foreign keys, add the reference back in:
//   userId: text("userId")
//     .notNull()
//     .references(() => user.id, { onDelete: "cascade" }),

// Connected Wallets (EVM, Solana, Bitcoin)
export const connectedWallets = pgTable(
  'connected_wallets',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
    chainType: text('chainType').notNull(), // 'EVM', 'Solana', 'Bitcoin'
    walletAddress: text('walletAddress').notNull(),
    walletProvider: text('walletProvider').notNull(), // 'MetaMask', 'WalletConnect', 'Unisat', 'Phantom', etc.
    isActive: boolean('isActive').notNull().default(true),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('connected_wallets_user_chain_address_idx').on(t.userId, t.chainType, t.walletAddress)]
)

// Transactions (Buy/Sell/Arbitrage trades)
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  walletId: text('walletId').notNull().references(() => connectedWallets.id, { onDelete: 'cascade' }),
  transactionType: text('transactionType').notNull(), // 'buy', 'sell', 'arbitrage'
  fromExchange: text('fromExchange'), // DEX or CEX name
  toExchange: text('toExchange'),
  tokenSymbol: text('tokenSymbol').notNull(),
  amount: numeric('amount').notNull(),
  buyPrice: numeric('buyPrice'),
  sellPrice: numeric('sellPrice'),
  profit: numeric('profit'),
  gasFeesEstimate: numeric('gasFeesEstimate'),
  transactionHash: text('transactionHash'),
  status: text('status').notNull().default('pending'), // 'pending', 'completed', 'failed'
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

// Price snapshots for arbitrage analysis
export const priceSnapshots = pgTable('price_snapshots', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  tokenSymbol: text('tokenSymbol').notNull(),
  exchange: text('exchange').notNull(), // DEX or CEX name
  price: numeric('price').notNull(),
  liquidity: numeric('liquidity'),
  volume24h: numeric('volume24h'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
})

export const exchangeCredentials = pgTable('exchange_credentials', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  exchangeId: text('exchange_id').notNull(),
  label: text('label').notNull(),
  apiKeyCiphertext: text('api_key_ciphertext').notNull(),
  apiSecretCiphertext: text('api_secret_ciphertext').notNull(),
  passphraseCiphertext: text('passphrase_ciphertext'),
  keyVersion: numeric('key_version').notNull().default('1'),
  status: text('status').notNull().default('active'),
  permissions: text('permissions').notNull().default('trade'),
  lastValidatedAt: timestamp('last_validated_at'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const arbitrageOpportunities = pgTable('arbitrage_opportunities', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), symbol: text('symbol').notNull(),
  buyExchange: text('buy_exchange').notNull(), sellExchange: text('sell_exchange').notNull(),
  buyPrice: numeric('buy_price').notNull(), sellPrice: numeric('sell_price').notNull(),
  quantity: numeric('quantity').notNull(), grossProfit: numeric('gross_profit').notNull(),
  estimatedFees: numeric('estimated_fees').notNull(), estimatedSlippage: numeric('estimated_slippage').notNull(),
  netProfit: numeric('net_profit').notNull(), netProfitBps: numeric('net_profit_bps').notNull(),
  observedAt: timestamp('observed_at').notNull(), expiresAt: timestamp('expires_at').notNull(),
  status: text('status').notNull().default('detected'), createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const executionOrders = pgTable('execution_orders', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), opportunityId: text('opportunity_id'),
  clientOrderId: text('client_order_id').notNull().unique(), exchangeId: text('exchange_id').notNull(),
  symbol: text('symbol').notNull(), side: text('side').notNull(), type: text('type').notNull(),
  amount: numeric('amount').notNull(), price: numeric('price'), filled: numeric('filled').notNull().default('0'),
  average: numeric('average'), status: text('status').notNull().default('created'), exchangeOrderId: text('exchange_order_id'),
  error: text('error'), createdAt: timestamp('created_at').notNull().defaultNow(), updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const tradingAuditLog = pgTable('trading_audit_log', {
  id: text('id').primaryKey(), userId: text('user_id').notNull(), event: text('event').notNull(),
  resourceId: text('resource_id'), metadata: text('metadata').notNull().default('{}'), createdAt: timestamp('created_at').notNull().defaultNow(),
})
