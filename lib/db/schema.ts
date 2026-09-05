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

export const connectedWallets = pgTable(
  'connected_wallets',
  {
    id: text('id').primaryKey(),
    userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
    chainType: text('chainType').notNull(),
    walletAddress: text('walletAddress').notNull(),
    walletProvider: text('walletProvider').notNull(),
    isActive: boolean('isActive').notNull().default(true),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('connected_wallets_user_chain_address_idx').on(t.userId, t.chainType, t.walletAddress)]
)

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  walletId: text('walletId').notNull().references(() => connectedWallets.id, { onDelete: 'cascade' }),
  transactionType: text('transactionType').notNull(),
  fromExchange: text('fromExchange'),
  toExchange: text('toExchange'),
  tokenSymbol: text('tokenSymbol').notNull(),
  amount: numeric('amount').notNull(),
  buyPrice: numeric('buyPrice'),
  sellPrice: numeric('sellPrice'),
  profit: numeric('profit'),
  gasFeesEstimate: numeric('gasFeesEstimate'),
  transactionHash: text('transactionHash'),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const priceSnapshots = pgTable('price_snapshots', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  tokenSymbol: text('tokenSymbol').notNull(),
  exchange: text('exchange').notNull(),
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

export const
