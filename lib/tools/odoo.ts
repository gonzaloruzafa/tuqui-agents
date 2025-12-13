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
  console.log('[Odoo Tool] Starting query with params:', params)
  
  // Leer config Odoo desde la tabla de configuración de tools
  const odooConfig = await getOdooConfig()
  const apiKey = process.env.ODOO_API_KEY
  
  console.log('[Odoo Tool] Config loaded:', { 
    hasConfig: !!odooConfig,
    url: odooConfig?.odoo_url,
    db: odooConfig?.odoo_db,
    user: odooConfig?.odoo_user,
    hasApiKey: !!apiKey
  })
  
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
    console.log('[Odoo Tool] Calling:', url)
    console.log('[Odoo Tool] Payload:', JSON.stringify(body, null, 2))
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Odoo Tool] HTTP Error:', res.status, errorText)
      return { success: false, error: `Odoo HTTP error ${res.status}: ${errorText}` }
    }
    
    const data = await res.json()
    console.log('[Odoo Tool] Response:', data)
    
    if (data.error) {
      console.error('[Odoo Tool] API Error:', data.error)
      return { success: false, error: `Odoo API error: ${data.error.message || JSON.stringify(data.error)}` }
    }
    
    return { success: true, data: data.result }
  } catch (err: any) {
    console.error('[Odoo Tool] Exception:', err)
    return { success: false, error: `Odoo exception: ${err.message}` }
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
