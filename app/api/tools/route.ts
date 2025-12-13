import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET - Obtener todas las tools
export async function GET() {
  try {
    const supabase = supabaseAdmin()
    
    const { data, error } = await supabase
      .from('tuqui_tools')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching tools:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Tools API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Crear una nueva tool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, name, description, type, parameters, config } = body

    if (!slug || !name) {
      return NextResponse.json(
        { error: 'slug and name are required' }, 
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin()

    const { data, error } = await supabase
      .from('tuqui_tools')
      .insert({
        slug,
        name,
        description,
        type: type || 'builtin',
        parameters: parameters || [],
        config: config || {},
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating tool:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tools API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Actualizar una tool existente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, name, description, type, parameters, config, enabled } = body

    if (!slug) {
      return NextResponse.json(
        { error: 'slug is required' }, 
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin()

    const { data, error } = await supabase
      .from('tuqui_tools')
      .update({
        name,
        description,
        type,
        parameters,
        config,
        enabled,
        updated_at: new Date().toISOString()
      })
      .eq('slug', slug)
      .select()
      .single()

    if (error) {
      console.error('Error updating tool:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Tools API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Eliminar una tool
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const { error } = await supabase
      .from('tuqui_tools')
      .delete()
      .eq('slug', slug)

    if (error) {
      console.error('Error deleting tool:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Tools API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
