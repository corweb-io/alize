import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface CreateClientBody {
  business_id?: string
  reference?: string | null
  name?: string
  address?: string | null
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as CreateClientBody
  if (!body.business_id) {
    return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      business_id: body.business_id,
      // Assigned by a DB trigger when omitted.
      reference: body.reference?.trim() || null,
      name: body.name,
      address: body.address?.trim() || null,
    })
    .select('id, reference, name, address')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ client: data })
}
