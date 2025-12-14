import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { invalidateAgentsCache } from '@/lib/agents-db'

export async function POST(request: NextRequest) {
  try {
    const { updates } = await request.json()

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Invalid updates array' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin()

    // Actualizar sort_order de cada agente
    for (const update of updates) {
      await supabase
        .from('tuqui_agents')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
    }

    invalidateAgentsCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering agents:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
