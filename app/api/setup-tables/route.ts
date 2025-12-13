import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    const supabase = supabaseAdmin()

    // Crear tabla tuqui_tools
    const createToolsTable = `
      create table if not exists tuqui_tools (
        slug text primary key,
        name text not null,
        description text,
        type text not null default 'builtin',
        parameters jsonb,
        config jsonb,
        enabled boolean default true,
        created_at timestamptz default now(),
        updated_at timestamptz default now()
      );
    `

    // Crear tabla tuqui_agent_tools
    const createAgentToolsTable = `
      create table if not exists tuqui_agent_tools (
        agent_id uuid references tuqui_agents(id) on delete cascade,
        tool_slug text references tuqui_tools(slug) on delete cascade,
        enabled boolean default true,
        primary key (agent_id, tool_slug)
      );
    `

    // Ejecutar SQL directamente usando el client de Supabase
    const { error: error1 } = await supabase.rpc('exec_sql', { 
      query: createToolsTable 
    }).single()

    if (error1 && error1.code !== 'PGRST116') {
      console.error('Error creating tuqui_tools:', error1)
      return NextResponse.json({ 
        error: `Failed to create tuqui_tools: ${error1.message}` 
      }, { status: 500 })
    }

    const { error: error2 } = await supabase.rpc('exec_sql', { 
      query: createAgentToolsTable 
    }).single()

    if (error2 && error2.code !== 'PGRST116') {
      console.error('Error creating tuqui_agent_tools:', error2)
      return NextResponse.json({ 
        error: `Failed to create tuqui_agent_tools: ${error2.message}` 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Tables created successfully'
    })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
