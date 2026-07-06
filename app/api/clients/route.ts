import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface CreateClientBody {
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
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  let reference = body.reference?.trim() || ''
  if (!reference) {
    const { data: refData, error: refError } = await supabase.rpc('generate_client_reference', {
      p_user_id: user.id,
    })
    if (refError || !refData) {
      return NextResponse.json(
        { error: refError?.message ?? 'Failed to generate reference' },
        { status: 500 }
      )
    }
    reference = refData
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      reference,
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
