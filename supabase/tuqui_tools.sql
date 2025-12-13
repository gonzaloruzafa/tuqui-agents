-- Tabla central de tools
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

-- Relación agente-tool (habilitación por agente)
create table if not exists tuqui_agent_tools (
  agent_id uuid references tuqui_agents(id) on delete cascade,
  tool_slug text references tuqui_tools(slug) on delete cascade,
  enabled boolean default true,
  primary key (agent_id, tool_slug)
);
