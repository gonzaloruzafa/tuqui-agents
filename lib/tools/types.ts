// Tipos base para el sistema de Tools

export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  default?: any
}

export interface ToolConfig {
  id?: string
  slug: string
  name: string
  description: string
  type: 'builtin' | 'api' | 'mcp'
  enabled?: boolean
  
  // Para type: 'api'
  api_endpoint?: string
  api_method?: 'GET' | 'POST'
  api_headers?: Record<string, string>
  api_body_template?: string
  response_path?: string
  
  // Para type: 'mcp'
  mcp_server_url?: string
  mcp_tool_name?: string
  
  // Parámetros
  parameters: ToolParameter[]
  
  created_at?: string
  updated_at?: string
}

// Tools habilitados para un agente específico
export interface AgentTool {
  agent_id: string
  tool_slug: string
  enabled: boolean
  config_override?: Record<string, any>  // Para configuración específica por agente
}

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
}

export interface ToolCall {
  tool: string
  params: Record<string, any>
}

// Tools builtin disponibles
export const BUILTIN_TOOLS = ['web_search', 'odoo', 'mercadolibre'] as const
export type BuiltinTool = typeof BUILTIN_TOOLS[number]
