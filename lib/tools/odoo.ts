import { ToolResult } from './types'
import { supabaseAdmin } from '../supabase'

// Interfaz para los parámetros esperados por la tool
export interface OdooToolParams {
  model: string // Ej: 'res.partner'
  domain?: any[] // Ej: [['customer', '=', true]]
  fields?: string[] // Ej: ['name', 'email']
  limit?: number
}

// Función para obtener la config de Odoo desde la tabla tuqui_tool_configs
async function getOdooConfig() {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('tuqui_tool_configs')
    .select('config')
    .eq('tool_slug', 'odoo')
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data.config as { odoo_url?: string, odoo_db?: string, odoo_user?: string }
}

export async function queryOdoo(params: OdooToolParams): Promise<ToolResult> {
  // Leer config Odoo desde la tabla de configuración de tools
  const odooConfig = await getOdooConfig()
  const apiKey = process.env.ODOO_API_KEY
  
  if (!odooConfig || !odooConfig.odoo_url || !odooConfig.odoo_db || !odooConfig.odoo_user) {
    return { success: false, error: 'Faltan datos de Odoo en la configuración. Configurá Odoo en Admin → Tools.' }
  }
  if (!apiKey) {
    return { success: false, error: 'Falta la API key de Odoo en las variables de entorno' }
  }

  const url = `${odooConfig.odoo_url}/jsonrpc`
  const body = {
    jsonrpc: '2.0',
    method: 'call',
    id: Date.now(),
    params: {
      service: 'object',
      method: 'execute_kw',
      args: [
        odooConfig.odoo_db,
        odooConfig.odoo_user,
        apiKey,
        params.model,
        'search_read',
        [params.domain || []],
        {
          fields: params.fields || [],
          limit: params.limit || 10
        }
      ]
    }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      return { success: false, error: `Odoo error: ${res.status}` }
    }
    const data = await res.json()
    if (data.error) {
      return { success: false, error: data.error.message }
    }
    return { success: true, data: data.result }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export const odooToolConfig = {
  slug: 'odoo',
  name: 'Odoo',
  description: 'Consultar datos de Odoo (clientes, facturas, productos, etc).',
  type: 'builtin' as const,
  parameters: [
    { name: 'model', type: 'string' as const, description: 'Modelo de Odoo (ej: res.partner)', required: true },
    { name: 'domain', type: 'string' as const, description: 'Filtro de búsqueda (Odoo domain)', required: false },
    { name: 'fields', type: 'string' as const, description: 'Campos a devolver', required: false },
    { name: 'limit', type: 'number' as const, description: 'Máximo de resultados', required: false }
  ]
}
