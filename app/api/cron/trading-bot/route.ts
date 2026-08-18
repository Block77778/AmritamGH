import { NextResponse } from 'next/server'
import { runBotForAllEnabledUsers } from '@/lib/trading/bot'
import { runDirectionalBotForAllEnabledUsers } from '@/lib/trading/directional-bot'
import { checkScheduledOrders } from '@/lib/trading/scheduled-orders'

export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const [arbitrageResults, directionalResults, scheduledOrderResults] = await Promise.all([
    runBotForAllEnabledUsers(),
    runDirectionalBotForAllEnabledUsers(),
    checkScheduledOrders(),
  ])
  return NextResponse.json({ ranAt: new Date().toISOString(), arbitrageResults, directionalResults, scheduledOrderResults })
}
