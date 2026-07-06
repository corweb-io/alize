import { createClient } from '@/lib/supabase/server'

export type Plan = 'free' | 'pro'

// Stripe statuses that still grant Pro access. past_due is a grace period.
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due']

export interface PlanInfo {
  plan: Plan
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
}

export async function getCurrentPlan(): Promise<PlanInfo> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      plan: 'free',
      status: 'none',
      current_period_end: null,
      cancel_at_period_end: false,
      stripe_customer_id: null,
    }
  }
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) {
    return {
      plan: 'free',
      status: 'none',
      current_period_end: null,
      cancel_at_period_end: false,
      stripe_customer_id: null,
    }
  }
  const active = ACTIVE_STATUSES.includes(data.status)
  return {
    plan: active ? (data.plan as Plan) : 'free',
    status: data.status,
    current_period_end: data.current_period_end,
    cancel_at_period_end: data.cancel_at_period_end,
    stripe_customer_id: data.stripe_customer_id,
  }
}

export interface Usage {
  clients: number
  invoicesThisMonth: number
}

export async function getUsage(): Promise<Usage> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { clients: 0, invoicesThisMonth: 0 }

  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)

  const [clientsRes, invoicesRes] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('document_type', 'invoice')
      .gte('created_at', startOfMonth.toISOString()),
  ])
  return {
    clients: clientsRes.count ?? 0,
    invoicesThisMonth: invoicesRes.count ?? 0,
  }
}

export async function canCreateClient(): Promise<boolean> {
  return true
}

export async function canCreateInvoice(): Promise<boolean> {
  return true
}
