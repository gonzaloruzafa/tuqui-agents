import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Obtener tools de un agente
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')

    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    
    const { data, error } = await supabase
      .from('tuqui_agent_tools')
      .select('*')
      .eq('agent_id', agentId)

    if (error) {
      console.error('Error fetching agent tools:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Agent tools API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Activar/desactivar un tool para un agente
export async function POST(request: NextRequest) {
  try {
    const { agentId, toolSlug, enabled } = await request.json()

    if (!agentId || !toolSlug) {
      return NextResponse.json(
        { error: 'agentId and toolSlug are required' }, 
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin()

    // Usar upsert para crear o actualizar
    const { data, error } = await supabase
      .from('tuqui_agent_tools')
      .upsert(
        {
          agent_id: agentId,
          tool_slug: toolSlug,
          enabled: enabled
        },
        {
          onConflict: 'agent_id,tool_slug'
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error upserting agent tool:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Agent tools API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
