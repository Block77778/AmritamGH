import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, TrendingUp, Zap, Shield, BarChart3, Lock, Globe, Rocket, ArrowUpRight } from 'lucide-react'
import { SwapWindow } from '@/components/swap-window'
import { RealWalletConnector } from '@/components/real-wallet-connector'

export const metadata = {
  title: 'AmritamGH - Enterprise Crypto Arbitrage Trading Platform',
  description: 'Capture real arbitrage opportunities across exchanges. Trade simultaneously and profit from price differences with AmritamGH',
}

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Premium Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-primary/10 bg-background/70 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-primary-foreground font-bold text-xl">₿</span>
            </div>
            <div>
              <div className="text-sm font-bold text-primary tracking-widest">AMRITAMGH</div>
              <div className="text-xs text-muted-foreground">ARBITRAGE</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider font-medium">FEATURES</a>
            <a href="#why" className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider font-medium">WHY US</a>
            <a href="#stats" className="text-xs text-muted-foreground hover:text-primary transition-colors tracking-wider font-medium">STATS</a>
          </div>
          <div className="flex items-center gap-3">
            <RealWalletConnector />
            <Link href="/sign-in">
              <Button variant="ghost" className="text-xs text-muted-foreground hover:text-foreground tracking-wider font-medium">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground text-xs tracking-wider font-semibold shadow-lg shadow-primary/30">Start Trading</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Premium Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/6 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/4 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Section - Enterprise Grade */}
      <section className="pt-40 pb-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                {/* Live Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full backdrop-blur-sm hover:bg-primary/15 transition-all">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-primary tracking-widest">LIVE ARBITRAGE</span>
                </div>

                {/* Main Heading with Gradient */}
                <h1 className="text-7xl md:text-8xl font-black leading-tight tracking-tight">
                  <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent block">Real Crypto</span>
                  <span className="text-foreground">Arbitrage Opportunity</span>
                </h1>

                {/* Subheading */}
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md font-medium">
                  Trade across multiple exchanges simultaneously. Capture price differences and profit from market inefficiencies with enterprise-grade precision.
                </p>
              </div>

              {/* Premium CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-8">
                <Link href="/sign-up">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground gap-2 rounded-xl font-bold shadow-2xl shadow-primary/40 text-base w-full sm:w-auto transition-all hover:shadow-primary/60">
                    Arbitrage Now
                    <Rocket className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="lg" variant="outline" className="border-primary/30 text-foreground hover:bg-primary/5 hover:border-primary/50 rounded-xl font-semibold text-base w-full sm:w-auto transition-all">
                    Learn More
                  </Button>
                </Link>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 pt-8">
                {[
                  { value: '$2.4B', label: 'Volume' },
                  { value: '150K+', label: 'Users' },
                  { value: '99.99%', label: 'Uptime' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25 rounded-xl p-4 hover:border-primary/40 transition-all hover:bg-primary/20">
                    <div className="text-3xl font-black text-primary mb-1">{stat.value}</div>
                    <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Visual - Premium Chart Card */}
            <div className="relative h-96 hidden lg:flex items-center justify-center">
              {/* Outer glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/25 to-primary/5 rounded-3xl blur-3xl opacity-50"></div>
              
              {/* Main card with glassmorphism */}
              <div className="relative w-full h-full rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-background/50 to-background/30 backdrop-blur-xl p-8 overflow-hidden shadow-2xl shadow-primary/20">
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/15 to-primary/0 opacity-40 animate-pulse"></div>
                
                {/* Content */}
                <div className="relative h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="text-sm text-primary font-semibold tracking-widest">ARBITRAGE OPPORTUNITY</div>
                    <div className="text-5xl font-black text-foreground">BTC/USD</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-background/40 rounded-lg p-3 backdrop-blur-sm">
                      <span className="text-sm text-muted-foreground font-medium">Buy on Binance</span>
                      <span className="text-xl font-bold text-primary">$63,080</span>
                    </div>
                    
                    <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/40 w-3/4 rounded-full"></div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-background/40 rounded-lg p-3 backdrop-blur-sm">
                      <span className="text-sm text-muted-foreground font-medium">Sell on Kraken</span>
                      <span className="text-xl font-bold text-green-400">$63,324</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500/20 to-green-500/10 border border-green-500/40 rounded-xl p-4 backdrop-blur-sm">
                    <div className="text-xs text-muted-foreground mb-1 font-medium tracking-wide">PROFIT OPPORTUNITY</div>
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-black text-green-400">+$244</div>
                      <div className="flex items-center gap-1 text-green-400 font-bold">
                        <ArrowUpRight className="w-5 h-5" />
                        0.39%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Swap Window Section - Premium */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 border-t border-primary/10 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-[0.5px]"></div>
        <div className="max-w-7xl mx-auto relative">
          <SwapWindow isAuthenticated={!!session?.user} />
        </div>
      </section>

      {/* Features Section - Enterprise Grid */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 border-t border-primary/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest">ENTERPRISE FEATURES</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-foreground mb-4">
              Professional Trading <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Tools</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to capture market inefficiencies across exchanges
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Live price tracking across 50+ exchanges' },
              { icon: Zap, title: 'Instant Execution', desc: 'Execute trades in milliseconds' },
              { icon: Shield, title: 'Enterprise Security', desc: 'Military-grade security protocols' },
              { icon: Globe, title: 'Multi-Exchange', desc: 'Access to global trading pairs' },
            ].map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={idx}
                  className="group relative p-8 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/10 to-background hover:from-primary/15 hover:to-background/80 hover:border-primary/30 transition-all duration-300 overflow-hidden shadow-lg hover:shadow-primary/15"
                >
                  {/* Hover background effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-primary/20 group-hover:bg-primary/30 flex items-center justify-center mb-4 transition-all">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2 text-lg">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why AmritamGH - Premium */}
      <section id="why" className="py-32 px-4 sm:px-6 lg:px-8 border-t border-primary/10 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black text-foreground mb-4">
              Why <span className="text-primary">AmritamGH</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              The most advanced arbitrage platform for serious traders
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: '🔐', title: 'Military-Grade Security', desc: 'Cold storage, multi-sig, encrypted keys, SOC 2 audited' },
              { icon: '⚡', title: 'Sub-Second Execution', desc: 'Execute 100ms faster than competitors' },
              { icon: '📊', title: 'Advanced Analytics', desc: 'AI-powered opportunity detection and tracking' },
              { icon: '🌍', title: '24/7 Global Support', desc: 'Expert support team in 15+ languages' },
              { icon: '💰', title: 'Lowest Fees', desc: 'Competitive rates with volume discounts up to 50%' },
              { icon: '🚀', title: 'Unlimited Scale', desc: 'Trade any amount without restrictions' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="group p-8 rounded-2xl border border-primary/10 bg-gradient-to-br from-background to-primary/5 hover:border-primary/30 hover:from-primary/10 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-foreground mb-2 text-lg">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section - Premium */}
      <section id="stats" className="py-32 px-4 sm:px-6 lg:px-8 border-t border-primary/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Trades Executed', value: '2.3M+' },
              { label: 'Total Volume', value: '$12.5B' },
              { label: 'Active Traders', value: '150K+' },
              { label: 'Success Rate', value: '99.8%' },
            ].map((stat) => (
              <div key={stat.label} className="text-center group">
                <div className="text-5xl md:text-6xl font-black text-primary mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary/60 group-hover:bg-clip-text transition-all">{stat.value}</div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 border-t border-primary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black text-foreground mb-6">
            Ready to Start <span className="text-primary">Arbitraging</span>?
          </h2>
          <p className="text-xl text-muted-foreground mb-12">
            Join thousands of professional traders capturing market opportunities daily
          </p>
          <Link href="/sign-up">
            <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground gap-2 rounded-xl font-bold shadow-2xl shadow-primary/40 text-base transition-all hover:shadow-primary/60">
              Get Started Today
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Premium Footer */}
      <footer className="border-t border-primary/10 bg-background/50 backdrop-blur py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="text-primary-foreground text-lg font-bold">₿</span>
                </div>
                <span className="font-bold text-foreground tracking-wide text-lg">AMRITAMGH</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enterprise crypto arbitrage trading platform. Trade, analyze, and profit from market inefficiencies across 50+ exchanges.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-primary text-xs mb-6 tracking-widest">PLATFORM</h4>
              <ul className="space-y-3">
                {['Arbitrage Finder', 'Price Monitor', 'Auto Trading', 'Analytics'].map((item) => (
                  <li key={item}><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-xs font-medium">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-primary text-xs mb-6 tracking-widest">LEARN</h4>
              <ul className="space-y-3">
                {['Guides', 'API Docs', 'Strategies', 'Support'].map((item) => (
                  <li key={item}><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-xs font-medium">{item}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-primary text-xs mb-6 tracking-widest">CONNECT</h4>
              <ul className="space-y-3">
                {['Twitter', 'Discord', 'Telegram'].map((item) => (
                  <li key={item}><a href="#" className="text-muted-foreground hover:text-primary transition-colors text-xs font-medium">{item}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-primary/10 pt-8">
            <p className="text-center text-xs text-muted-foreground font-medium">
              © 2024 AMRITAMGH ARBITRAGE. All rights reserved. | Enterprise-Grade Arbitrage Trading
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
