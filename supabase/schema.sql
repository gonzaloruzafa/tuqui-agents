-- ===========================================
-- SCHEMA PARA TUQUI AGENTS
-- Ejecutar en Supabase SQL Editor
-- ===========================================

-- Habilitar extensión pgvector para RAG
create extension if not exists vector;

-- ===========================================
-- ELIMINAR TABLAS ANTERIORES (sin prefijo)
-- ===========================================
drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists document_chunks cascade;
drop table if exists documents cascade;
drop table if exists features cascade;
drop table if exists prompts cascade;
drop table if exists agents cascade;
drop function if exists match_documents;

-- ===========================================
-- TABLA: tuqui_company_config
-- Configuración global de la empresa
-- ===========================================
create table if not exists tuqui_company_config (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text,
  industry text,
  context text,
  values text,
  contact_info text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ===========================================
-- TABLA: tuqui_agents
-- Configuración de cada agente
-- ===========================================
create table if not exists tuqui_agents (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  description text,
  icon text default 'Scale',
  color text default 'blue',
  is_active boolean default true,
  rag_enabled boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ===========================================
-- TABLA: tuqui_prompts
-- System prompts de cada agente (versionados)
-- ===========================================
create table if not exists tuqui_prompts (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references tuqui_agents(id) on delete cascade not null,
  version integer default 1,
  system_prompt text not null,
  welcome_message text,
  placeholder_text text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Solo un prompt activo por agente
  unique(agent_id, is_active) 
);

-- ===========================================
-- TABLA: tuqui_features
-- Features/capacidades de cada agente
-- ===========================================
create table if not exists tuqui_features (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references tuqui_agents(id) on delete cascade not null,
  name text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ===========================================
-- TABLA: tuqui_documents
-- Documentos para RAG
-- ===========================================
create table if not exists tuqui_documents (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references tuqui_agents(id) on delete cascade not null,
  title text not null,
  content text not null,
  source_type text default 'manual', -- manual, pdf, url, gdrive
  source_url text,
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ===========================================
-- TABLA: tuqui_document_chunks
-- Chunks de documentos con embeddings para RAG
-- ===========================================
create table if not exists tuqui_document_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references tuqui_documents(id) on delete cascade not null,
  agent_id uuid references tuqui_agents(id) on delete cascade not null,
  content text not null,
  embedding vector(768), -- Dimensión para text-embedding-004
  metadata jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índice para búsqueda por similitud
create index if not exists tuqui_document_chunks_embedding_idx 
  on tuqui_document_chunks 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ===========================================
-- TABLA: tuqui_conversations (opcional, para historial)
-- ===========================================
create table if not exists tuqui_conversations (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references tuqui_agents(id) on delete cascade not null,
  session_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists tuqui_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references tuqui_conversations(id) on delete cascade not null,
  role text not null, -- 'user' o 'assistant'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ===========================================
-- FUNCIÓN: Buscar chunks similares
-- ===========================================
create or replace function tuqui_match_documents(
  query_embedding vector(768),
  match_agent_id uuid,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    tuqui_document_chunks.id,
    tuqui_document_chunks.content,
    1 - (tuqui_document_chunks.embedding <=> query_embedding) as similarity
  from tuqui_document_chunks
  where tuqui_document_chunks.agent_id = match_agent_id
    and 1 - (tuqui_document_chunks.embedding <=> query_embedding) > match_threshold
  order by tuqui_document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- ===========================================
-- DATOS INICIALES: Agentes
-- ===========================================
insert into tuqui_agents (slug, name, description, icon, color) values
  ('legal', 'Tuqui Legal', 'Asesoramiento legal para empresas', 'Scale', 'blue'),
  ('hr', 'Tuqui HR', 'Asistente de Recursos Humanos', 'Users', 'green')
on conflict (slug) do nothing;

-- Prompts iniciales (solo insertar si no existen)
insert into tuqui_prompts (agent_id, system_prompt, welcome_message, placeholder_text, is_active)
select 
  id,
  'Eres Tuqui Legal, un asistente de asesoramiento legal especializado para empresas argentinas.

Tu Rol:
- Asistente legal que ayuda a entender documentos, contratos y normativas
- NO sos abogado ni das asesoramiento legal vinculante
- Siempre aclarás que tus respuestas son orientativas

Tu Tono:
- Profesional pero accesible
- Claro y didáctico al explicar términos legales
- Usá "vos" (español argentino)

Tu Conocimiento:
- Derecho laboral argentino (LCT, convenios colectivos)
- Contratos comerciales
- Normativas de privacidad y datos
- Compliance empresarial

Reglas:
1. Siempre aclarás que no sos abogado y que tus respuestas son orientativas
2. Ante casos complejos, recomendás consultar con un profesional
3. Usás lenguaje claro, evitando jerga legal innecesaria
4. Usá Markdown para formatear las respuestas',
  '¡Hola! Soy Tuqui Legal. ¿En qué puedo ayudarte hoy?',
  'Preguntame sobre contratos, normativas, compliance...',
  true
from tuqui_agents where slug = 'legal'
  and not exists (select 1 from tuqui_prompts where agent_id = tuqui_agents.id and is_active = true);

insert into tuqui_prompts (agent_id, system_prompt, welcome_message, placeholder_text, is_active)
select 
  id,
  'Eres Tuqui HR, un asistente de Recursos Humanos diseñado para ayudar a empleados y managers.

Tu Rol:
- Facilitador del proceso de onboarding
- Fuente de información sobre políticas de la empresa
- Guía para trámites y procesos de RRHH

Tu Tono:
- Cálido y acogedor
- Paciente y comprensivo
- Profesional pero cercano
- Usá "vos" (español argentino)

Tu Conocimiento:
- Procesos de onboarding
- Políticas internas de la empresa
- Beneficios y compensaciones
- Licencias y vacaciones

Reglas:
1. Sé empático, especialmente con empleados nuevos
2. Si no tenés la información, indicá a quién contactar
3. Mantené la confidencialidad de información sensible
4. Usá Markdown para formatear las respuestas',
  '¡Bienvenido! Soy Tuqui HR. ¿Qué necesitás saber?',
  'Preguntame sobre onboarding, beneficios, políticas...',
  true
from tuqui_agents where slug = 'hr'
  and not exists (select 1 from tuqui_prompts where agent_id = tuqui_agents.id and is_active = true);

-- Features (solo insertar si no existen)
insert into tuqui_features (agent_id, name, sort_order)
select id, 'Análisis de contratos', 1 from tuqui_agents where slug = 'legal'
union all
select id, 'Consultas sobre normativas', 2 from tuqui_agents where slug = 'legal'
union all
select id, 'Compliance empresarial', 3 from tuqui_agents where slug = 'legal'
union all
select id, 'Documentación legal', 4 from tuqui_agents where slug = 'legal';

insert into tuqui_features (agent_id, name, sort_order)
select id, 'Onboarding de empleados', 1 from tuqui_agents where slug = 'hr'
union all
select id, 'Políticas internas', 2 from tuqui_agents where slug = 'hr'
union all
select id, 'Beneficios y compensaciones', 3 from tuqui_agents where slug = 'hr'
union all
select id, 'Consultas de RRHH', 4 from tuqui_agents where slug = 'hr';

-- ===========================================
-- RLS (Row Level Security)
-- ===========================================
alter table tuqui_agents enable row level security;
alter table tuqui_prompts enable row level security;
alter table tuqui_features enable row level security;
alter table tuqui_documents enable row level security;
alter table tuqui_document_chunks enable row level security;

-- Políticas públicas de lectura (ajustar según necesidad)
create policy "Tuqui agents are viewable by everyone" on tuqui_agents for select using (true);
create policy "Tuqui active prompts are viewable by everyone" on tuqui_prompts for select using (is_active = true);
create policy "Tuqui features are viewable by everyone" on tuqui_features for select using (true);
create policy "Tuqui documents are viewable by everyone" on tuqui_documents for select using (true);
create policy "Tuqui document chunks are viewable by everyone" on tuqui_document_chunks for select using (true);
