import { supabase } from './supabase'

export interface AgentConfig {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  color: string
  is_active: boolean
  rag_enabled?: boolean
  system_prompt: string
  welcome_message: string
  placeholder_text: string
  features: string[]
  // Para compatibilidad con la API actual
  prompt?: {
    content: string
    version: number
  }
}

// Cache en memoria para evitar llamadas repetidas
let agentsCache: AgentConfig[] | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 60 * 1000 // 1 minuto

export async function getAgentsFromDB(): Promise<AgentConfig[]> {
  // Retornar cache si es válido
  if (agentsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return agentsCache
  }

  try {
    const { data: agents, error } = await supabase()
      .from('tuqui_agents')
      .select(`
        id,
        slug,
        name,
        description,
        icon,
        color,
        is_active,
        rag_enabled,
        sort_order,
        tuqui_prompts!inner (
          system_prompt,
          welcome_message,
          placeholder_text,
          is_active,
          version
        ),
        tuqui_features (
          name,
          sort_order
        )
      `)
      .eq('is_active', true)
      .eq('tuqui_prompts.is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching agents:', error)
      return []
    }

    const formattedAgents: AgentConfig[] = agents.map((agent: any) => ({
      id: agent.id,
      slug: agent.slug,
      name: agent.name,
      description: agent.description || '',
      icon: agent.icon || 'Scale',
      color: agent.color || 'blue',
      is_active: agent.is_active,
      rag_enabled: agent.rag_enabled || false,
      system_prompt: agent.tuqui_prompts[0]?.system_prompt || '',
      welcome_message: agent.tuqui_prompts[0]?.welcome_message || '',
      placeholder_text: agent.tuqui_prompts[0]?.placeholder_text || '',
      features: agent.tuqui_features
        ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((f: any) => f.name) || [],
      // Para compatibilidad con la API
      prompt: agent.tuqui_prompts[0] ? {
        content: agent.tuqui_prompts[0].system_prompt,
        version: agent.tuqui_prompts[0].version
      } : undefined
    }))

    // Actualizar cache
    agentsCache = formattedAgents
    cacheTimestamp = Date.now()

    return formattedAgents
  } catch (error) {
    console.error('Error in getAgentsFromDB:', error)
    return []
  }
}

// Obtener todos los agentes
export async function getAllAgents(): Promise<AgentConfig[]> {
  return getAgentsFromDB()
}

export async function getAgentBySlugFromDB(slug: string): Promise<AgentConfig | null> {
  const agents = await getAgentsFromDB()
  return agents.find(a => a.slug === slug) || null
}

export async function getAgentByIdFromDB(id: string): Promise<AgentConfig | null> {
  const agents = await getAgentsFromDB()
  return agents.find(a => a.id === id) || null
}

// Función para invalidar cache (útil después de updates)
export function invalidateAgentsCache() {
  agentsCache = null
  cacheTimestamp = 0
}
