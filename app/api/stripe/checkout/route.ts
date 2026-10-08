import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/server'
import { priceIdFor, type Interval } from '@/lib/stripe/prices'

export const runtime = 'nodejs'

function appUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_APP_URL')
  return url
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let interval: Interval = 'monthly'
  try {
    const body = await req.json()
    if (body?.interval === 'yearly' || body?.interval === 'monthly') {
      interval = body.interval
    }
  } catch {
    // empty body is fine — default to monthly
  }

  const admin = supabaseAdmin()

  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId = existing?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await admin
      .from('subscriptions')
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: 'user_id' })
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceIdFor(interval), quantity: 1 }],
    success_url: `${appUrl()}/account/billing?status=success`,
    cancel_url: `${appUrl()}/account/billing?status=cancel`,
    allow_promotion_codes: true,
  })

  if (!session.url) {
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
  return NextResponse.json({ url: session.url })
}
