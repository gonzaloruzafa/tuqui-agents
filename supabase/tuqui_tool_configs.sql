-- Tabla para configuraciones específicas de cada tool
create table if not exists tuqui_tool_configs (
  tool_slug text primary key references tuqui_tools(slug) on delete cascade,
  config jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índice para búsquedas rápidas
create index if not exists idx_tool_configs_tool_slug on tuqui_tool_configs(tool_slug);
