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

// Agente general hardcodeado - siempre disponible
export const GENERAL_AGENT: AgentConfig = {
  id: 'general-tuqui-chat',
  slug: 'general',
  name: 'Tuqui Chat',
  description: 'Asistente general para cualquier tarea',
  icon: 'Sparkles',
  color: 'violet',
  is_active: true,
  rag_enabled: false,
  system_prompt: `Sos Tuqui, un asistente de IA general para empleados de la empresa.

Tu Rol:
- Ayudar con cualquier tarea o consulta del día a día
- Redactar textos, emails, documentos
- Responder preguntas generales
- Ayudar con análisis, resúmenes y organización de información
- Dar ideas y sugerencias creativas
- Explicar conceptos de forma clara

Tu Tono:
- Amigable y profesional
- Claro y conciso
- Proactivo en ofrecer ayuda adicional
- Usá "vos" (español argentino)

Capacidades:
- Redacción y corrección de textos
- Resúmenes y análisis
- Brainstorming e ideas
- Explicaciones y tutoriales
- Organización de información
- Cálculos y estimaciones básicas

Reglas:
1. Siempre ofrecé alternativas o mejoras cuando sea posible
2. Si no sabés algo, decilo honestamente
3. Usá Markdown para formatear las respuestas cuando sea útil
4. Sé conciso pero completo`,
  welcome_message: '¡Hola! Soy Tuqui, tu asistente general. ¿En qué puedo ayudarte hoy?',
  placeholder_text: 'Preguntame lo que necesites...',
  features: ['Redacción', 'Análisis', 'Ideas', 'Organización'],
  prompt: {
    content: '',
    version: 1
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
      .order('name')

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

// Obtener todos los agentes incluyendo el general hardcodeado
export async function getAllAgents(): Promise<AgentConfig[]> {
  const dbAgents = await getAgentsFromDB()
  // Agregar el agente general al principio si no está en la DB
  const hasGeneral = dbAgents.some(a => a.slug === 'general')
  if (!hasGeneral) {
    return [GENERAL_AGENT, ...dbAgents]
  }
  return dbAgents
}

export async function getAgentBySlugFromDB(slug: string): Promise<AgentConfig | null> {
  // Primero verificar si es el agente general hardcodeado
  if (slug === 'general') {
    const dbAgents = await getAgentsFromDB()
    const dbGeneral = dbAgents.find(a => a.slug === 'general')
    return dbGeneral || GENERAL_AGENT
  }
  const agents = await getAgentsFromDB()
  return agents.find(a => a.slug === slug) || null
}

export async function getAgentByIdFromDB(id: string): Promise<AgentConfig | null> {
  // Verificar si es el ID del agente general hardcodeado
  if (id === GENERAL_AGENT.id) {
    return GENERAL_AGENT
  }
  const agents = await getAgentsFromDB()
  return agents.find(a => a.id === id) || null
}

// Función para invalidar cache (útil después de updates)
export function invalidateAgentsCache() {
  agentsCache = null
  cacheTimestamp = 0
}
