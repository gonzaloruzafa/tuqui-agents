import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zwtvnxhjypomldokssbt.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dHZueGhqeXBvbWxkb2tzc2J0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDUyNjE2MiwiZXhwIjoyMDgwMTAyMTYyfQ.E0_My45lH0xMmFvNmdjk8l9pxyEvK3gceMLfUDtUg4A'

const createTables = async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  console.log('Creating tuqui_tools table...')

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

  const createAgentToolsTable = `
    create table if not exists tuqui_agent_tools (
      agent_id uuid references tuqui_agents(id) on delete cascade,
      tool_slug text references tuqui_tools(slug) on delete cascade,
      enabled boolean default true,
      primary key (agent_id, tool_slug)
    );
  `

  // Ejecutar queries con rpc
  const { error: error1 } = await supabase.rpc('exec_sql', { sql: createToolsTable })
  if (error1) {
    console.error('Error creating tuqui_tools:', error1)
  } else {
    console.log('✓ tuqui_tools table created')
  }

  const { error: error2 } = await supabase.rpc('exec_sql', { sql: createAgentToolsTable })
  if (error2) {
    console.error('Error creating tuqui_agent_tools:', error2)
  } else {
    console.log('✓ tuqui_agent_tools table created')
  }

  process.exit(0)
}

createTables()
