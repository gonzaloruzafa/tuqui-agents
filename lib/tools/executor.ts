import { ToolConfig, ToolResult, BUILTIN_TOOLS } from './types'
import { supabaseAdmin } from '@/lib/supabase'
import { searchWeb, tavilyToolConfig } from './tavily'
import { queryOdoo, odooToolConfig } from './odoo'

// Ejecutar un tool basado en su configuración
export async function executeTool(
  toolSlug: string,
  params: Record<string, any>
): Promise<ToolResult> {
  try {
    // Primero verificar si es un tool builtin
    if (toolSlug === 'web_search') {
      return await searchWeb(params.query, params)
    }
    if (toolSlug === 'odoo') {
      return await queryOdoo(params)
    }

    // Si no es builtin, buscar en la DB
    const config = await getToolConfig(toolSlug)
    if (!config) {
      return { success: false, error: `Tool "${toolSlug}" no encontrado` }
    }

    if (config.type === 'api') {
      return await executeApiTool(config, params)
    } else if (config.type === 'mcp') {
      return await executeMcpTool(config, params)
    }

    return { success: false, error: 'Tipo de tool no soportado' }
  } catch (error: any) {
    console.error(`[Tools] Error ejecutando ${toolSlug}:`, error)
    return { success: false, error: error.message }
  }
}

// Ejecutar tool tipo API
async function executeApiTool(
  config: ToolConfig, 
  params: Record<string, any>
): Promise<ToolResult> {
  if (!config.api_endpoint) {
    return { success: false, error: 'API endpoint no configurado' }
  }

  // Reemplazar parámetros en la URL (para GET con query params)
  let url = config.api_endpoint
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`{{${key}}}`, encodeURIComponent(String(value)))
  }

  // Preparar opciones de fetch
  const fetchOptions: RequestInit = {
    method: config.api_method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...config.api_headers
    }
  }

  // Si es POST, preparar body
  if (config.api_method === 'POST' && config.api_body_template) {
    let body = config.api_body_template
    for (const [key, value] of Object.entries(params)) {
      body = body.replace(`{{${key}}}`, JSON.stringify(value))
    }
    fetchOptions.body = body
  }

  const res = await fetch(url, fetchOptions)
  
  if (!res.ok) {
    return { success: false, error: `API respondió con status ${res.status}` }
  }

  let data = await res.json()

  // Extraer datos si hay response_path configurado
  if (config.response_path) {
    const paths = config.response_path.split('.')
    for (const path of paths) {
      if (data && typeof data === 'object') {
        data = data[path]
      }
    }
  }

  return { success: true, data }
}

// Ejecutar tool tipo MCP
async function executeMcpTool(
  config: ToolConfig, 
  params: Record<string, any>
): Promise<ToolResult> {
  if (!config.mcp_server_url) {
    return { success: false, error: 'MCP server URL no configurado' }
  }

  const res = await fetch(`${config.mcp_server_url}/tools/${config.mcp_tool_name || config.slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params })
  })

  if (!res.ok) {
    return { success: false, error: `MCP server respondió con status ${res.status}` }
  }

  const data = await res.json()
  return { success: true, data }
}

// Cargar configuración de un tool custom
async function getToolConfig(slug: string): Promise<ToolConfig | null> {
  const supabase = supabaseAdmin()
  
  const { data, error } = await supabase
    .from('tuqui_tools')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}

// Cargar tools habilitados para un agente
export async function getAgentTools(agentId: string): Promise<ToolConfig[]> {
  const supabase = supabaseAdmin()
  
  // Obtener tools habilitados para este agente
  const { data: agentTools, error } = await supabase
    .from('tuqui_agent_tools')
    .select('tool_slug')
    .eq('agent_id', agentId)
    .eq('enabled', true)

  if (error || !agentTools) {
    return []
  }

  const enabledSlugs = agentTools.map(at => at.tool_slug)
  const tools: ToolConfig[] = []

  // Intentar cargar tools desde la DB primero
  if (enabledSlugs.length > 0) {
    const { data: dbTools } = await supabase
      .from('tuqui_tools')
      .select('*')
      .in('slug', enabledSlugs)
      .eq('enabled', true)

    if (dbTools) {
      tools.push(...dbTools)
    }
  }

  // Fallback: agregar tools builtin hardcodeadas si no están en la DB
  const dbSlugs = tools.map(t => t.slug)
  if (enabledSlugs.includes('web_search') && !dbSlugs.includes('web_search')) {
    tools.push(tavilyToolConfig)
  }
  if (enabledSlugs.includes('odoo') && !dbSlugs.includes('odoo')) {
    tools.push(odooToolConfig)
  }

  return tools
}

// Generar prompt de tools para un agente
export function generateToolsPrompt(tools: ToolConfig[]): string {
  if (tools.length === 0) return ''

  const toolDescriptions = tools.map(t => {
    let desc = `- ${t.slug}: ${t.description}`
    if (t.parameters && t.parameters.length > 0) {
      const params = t.parameters
        .map(p => `${p.name} (${p.type}${p.required ? ', requerido' : ''})`)
        .join(', ')
      desc += ` [Parámetros: ${params}]`
    }
    return desc
  }).join('\n')

  return `
HERRAMIENTAS DISPONIBLES:
Cuando necesites información externa en tiempo real (búsquedas web, datos actuales, etc.), podés usar estas herramientas.
Para usar una herramienta, respondé ÚNICAMENTE con un JSON en este formato exacto:
{"tool": "nombre_del_tool", "params": {"param1": "valor1"}}

${toolDescriptions}

IMPORTANTE: Si usás una herramienta, tu respuesta debe ser SOLO el JSON, nada más.
Si no necesitás usar una herramienta, respondé normalmente.
`
}

// Detectar si una respuesta es una llamada a tool
export function parseToolCall(response: string): { tool: string, params: Record<string, any> } | null {
  const trimmed = response.trim()
  
  // Buscar JSON en la respuesta
  const jsonMatch = trimmed.match(/\{[\s\S]*"tool"[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0])
    if (parsed.tool && typeof parsed.tool === 'string') {
      return {
        tool: parsed.tool,
        params: parsed.params || {}
      }
    }
  } catch {
    // No es JSON válido
  }

  return null
}
