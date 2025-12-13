import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Obtener configuración de una tool específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const toolSlug = searchParams.get('slug')

    if (!toolSlug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    
    const { data, error } = await supabase
      .from('tuqui_tool_configs')
      .select('*')
      .eq('tool_slug', toolSlug)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching tool config:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || { tool_slug: toolSlug, config: {} })
  } catch (error: any) {
    console.error('Tool config API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST/PUT - Guardar o actualizar configuración de una tool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tool_slug, config } = body

    if (!tool_slug) {
      return NextResponse.json({ error: 'tool_slug is required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Upsert (insertar o actualizar)
    const { data, error } = await supabase
      .from('tuqui_tool_configs')
      .upsert({
        tool_slug,
        config,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tool_slug'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving tool config:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tool config API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
