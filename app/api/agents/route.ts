import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAgentsFromDB, getAgentBySlugFromDB, invalidateAgentsCache } from '@/lib/agents-db'

// GET - Listar agentes o obtener uno específico
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const id = searchParams.get('id')

  if (slug) {
    // Usar la función que ya funciona correctamente
    const agent = await getAgentBySlugFromDB(slug)
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(agent)
  }

  if (id) {
    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('tuqui_agents')
      .select(`
        *,
        tuqui_prompts(system_prompt, welcome_message, placeholder_text, version, is_active),
        tuqui_features(name, sort_order)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    // Formatear respuesta
    const activePrompt = data.tuqui_prompts?.find((p: any) => p.is_active) || data.tuqui_prompts?.[0]
    const formatted = {
      ...data,
      system_prompt: activePrompt?.system_prompt || '',
      welcome_message: activePrompt?.welcome_message || '',
      placeholder_text: activePrompt?.placeholder_text || '',
      features: data.tuqui_features
        ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((f: any) => f.name) || [],
      prompt: activePrompt ? {
        content: activePrompt.system_prompt,
        version: activePrompt.version
      } : undefined
    }
    delete formatted.tuqui_prompts
    delete formatted.tuqui_features

    return NextResponse.json(formatted)
  }

  // Listar todos
  const agents = await getAgentsFromDB()
  return NextResponse.json(agents)
}

// POST - Crear agente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, slug, description, icon, color, systemPrompt, features } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields (name, slug)' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin()
    
    // Crear agente
    const { data: agent, error: agentError } = await supabase
      .from('tuqui_agents')
      .insert({
        name,
        slug,
        description,
        icon,
        color
      })
      .select()
      .single()

    if (agentError) {
      return NextResponse.json(
        { error: agentError.message },
        { status: 500 }
      )
    }

    // Crear prompt si se proporciona
    if (systemPrompt) {
      await supabase
        .from('tuqui_prompts')
        .insert({
          agent_id: agent.id,
          system_prompt: systemPrompt,
          version: 1,
          is_active: true
        })
    }

    // Crear features si se proporcionan
    if (features && Array.isArray(features)) {
      for (const feature of features) {
        await supabase
          .from('tuqui_features')
          .insert({
            agent_id: agent.id,
            title: feature.title || feature,
            description: feature.description || ''
          })
      }
    }

    invalidateAgentsCache()
    return NextResponse.json(agent)
  } catch (error: any) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PUT - Actualizar agente
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, icon, color, systemPrompt, ragEnabled } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing agent id' },
        { status: 400 }
      )
    }

    const supabase = supabaseAdmin()
    
    // Actualizar agente
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color
    if (ragEnabled !== undefined) updateData.rag_enabled = ragEnabled

    const { data: agent, error: agentError } = await supabase
      .from('tuqui_agents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (agentError) {
      return NextResponse.json(
        { error: agentError.message },
        { status: 500 }
      )
    }

    // Actualizar prompt si se proporciona
    if (systemPrompt !== undefined) {
      // Desactivar prompts anteriores
      await supabase
        .from('tuqui_prompts')
        .update({ is_active: false })
        .eq('agent_id', id)

      // Obtener versión más alta
      const { data: lastPrompt } = await supabase
        .from('tuqui_prompts')
        .select('version')
        .eq('agent_id', id)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      const newVersion = (lastPrompt?.version || 0) + 1

      // Crear nuevo prompt
      await supabase
        .from('tuqui_prompts')
        .insert({
          agent_id: id,
          system_prompt: systemPrompt,
          version: newVersion,
          is_active: true
        })
    }

    invalidateAgentsCache()
    return NextResponse.json(agent)
  } catch (error: any) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar agente
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'Missing agent id' },
      { status: 400 }
    )
  }

  const supabase = supabaseAdmin()
  const { error } = await supabase
    .from('tuqui_agents')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  invalidateAgentsCache()
  return NextResponse.json({ success: true })
}
